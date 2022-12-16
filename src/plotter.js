import Plotter from './plotter.worker.js?worker'
import { getFunctionParams, timeout } from './utils'

const workersType = {}

const promisesType = {}
const uuid4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
const sendToPlotter = async (index, message, type) => {
  if (!promisesType[type]) {
    promisesType[type] = {}
  }
  if (!workersType[type]) {
    workersType[type] = {}
  }
  const uuid = uuid4()

  const promises = promisesType[type]
  const workers = workersType[type]

  if (!workers[index]) {
    workers[index] = new Plotter()
  }
  let plotter = workers[index]

  if (promises[index]) {
    let value

    try {
      value = await Promise.race([promises[index], timeout(40)])
    } catch (e) {
      promises[index] = null
      if (e !== 'CANCEL') {
        throw e
      }
    }
    if (value === 'timeout') {
      plotter.terminate()
      promises[index]?.reject('CANCEL')
      workers[index] = plotter = new Plotter()
    }
  }

  plotter.postMessage({ ...message, uuid })
  try {
    let rej = null
    promises[index] = new Promise((resolve, reject) => {
      rej = reject
      const handleError = event => {
        reject(
          new Error(
            `Error in plotter ${event.message} (${event.filename}:${event.lineno})`
          )
        )
      }
      const filterMessage = ({ data }) => {
        if (data.uuid === uuid) {
          promises[index] = null
          resolve(data)
          plotter.removeEventListener('message', filterMessage)
          plotter.removeEventListener('error', handleError)
        }
      }
      plotter.addEventListener('message', filterMessage)
      plotter.addEventListener('error', handleError)
    })
    promises[index].reject = rej
    const data = await promises[index]
    return data
  } catch (e) {
    promises[index] = null
    if (e !== 'CANCEL') {
      throw e
    }
    return null
  }
}

export const plotFunctions = async (functions, region, recordings, job) => {
  const functionsText = functions
    .split(/[;\n]/)
    .map(fun => fun.trim())
    .filter(x => x)
  const affects = []
  let functionsTypeValues = []
  // Filter plot functions and affects
  for (let i = 0; i < functionsText.length; i++) {
    let recs
    let { type, funs, recIndexes, ...params } = getFunctionParams(
      functionsText[i],
      region
    )
    if (recIndexes) {
      recs = {}
      recIndexes.map(i => ~~i).forEach(i => (recs[i] = recordings[i - 1]))
    }
    if (type === 'affect') {
      affects.push(funs)
    } else {
      functionsTypeValues.push({ type, funs, recs, ...params })
    }
  }
  // Order without affect
  for (let i = 0; i < functionsTypeValues.length; i++) {
    functionsTypeValues[i].index = i
  }
  // Remove sound when sound
  if (job === 'sound') {
    functionsTypeValues = functionsTypeValues.filter(({ type }) =>
      ['sound', 'affect'].includes(type)
    )
  }
  // Plot functions
  return (
    await Promise.all(
      functionsTypeValues.map(({ index, ...params }) =>
        sendToPlotter(
          index,
          {
            index,
            region,
            affects,
            job,
            ...params,
          },
          job
        )
      )
    )
  ).filter(x => x)
}
