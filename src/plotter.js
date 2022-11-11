import Plotter from './plotter.worker.js?worker'
import { getFunctionType } from './utils'

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
  typeToValues,
  recordings,
  options = {}
) => {
  const functionsText = functions.split(';').map(fun => fun.trim())
  const affects = []
  const functionsTypeValues = []
  // Filter plot functions and affects
  for (let i = 0; i < functionsText.length; i++) {
    let { type, funs, recs } = getFunctionType(functionsText[i])
    if (type === 'affect') {
      affects.push(funs)
    } else if (type !== 'unknown') {
      if (recs) {
        recs.map(i => ~~i).forEach(i => (recs[i] = recordings[i - 1]))
      }
      const values = typeToValues(type)
      functionsTypeValues.push({ type, funs, values, recs })
    }
  }
  // Create missing workers
  for (let i = 0; i < functionsTypeValues.length; i++) {
    if (!workers[i]) {
      workers[i] = new Plotter()
    }
    functionsTypeValues[i].index = i
  }

  // Plot functions
  const data = await Promise.all(
    functionsTypeValues.map(({ index, type, funs, values, recs }) =>
      sendToPlotter(
        index,
        { index, type, funs, values, affects, recs, ...options },
        [values.buffer]
      )
    )
  )
  return data
}
