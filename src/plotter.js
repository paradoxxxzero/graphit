import Plotter from './plotter.worker.js?worker'
import { getFunctionParams } from './utils'

const workers = []

const uuid4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const sendToPlotter = async (index, message, transfer) => {
  const plotter = workers[index]
  const uuid = uuid4()

  plotter.postMessage({ ...message, uuid }, transfer)
  return await new Promise(resolve => {
    const filterMessage = ({ data }) => {
      if (data.uuid === uuid) {
        resolve(data)
        plotter.removeEventListener('message', filterMessage)
      }
    }
    plotter.addEventListener('message', filterMessage)
  })
}

export const plotFunctions = async (
  functions,
  region,
  recordings,
  options = {}
) => {
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
      region,
      options
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
  // Create missing workers
  for (let i = 0; i < functionsTypeValues.length; i++) {
    if (!workers[i]) {
      workers[i] = new Plotter()
    }
    functionsTypeValues[i].index = i
  }
  if (options.audio) {
    functionsTypeValues = functionsTypeValues.filter(({ type }) =>
      ['sound', 'affect'].includes(type)
    )
  }
  // Plot functions
  const data = await Promise.all(
    functionsTypeValues.map(({ index, ...params }) =>
      sendToPlotter(index, {
        index,
        region,
        affects,
        ...params,
        ...options,
      })
    )
  )

  return data
}
