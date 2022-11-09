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

const sendToPlotter = async (index, message) => {
  const plotter = workers[index]
  const uuid = uuid4()

  plotter.postMessage({ ...message, uuid })

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

export const plotFunctions = async (functions, typeToValues, options = {}) => {
  const functionsText = functions.split(';').map(fun => fun.trim())
  const affects = []
  const functionsTypeValues = []
  // Filter plot functions and affects
  for (let i = 0; i < functionsText.length; i++) {
    const { type, funs } = getFunctionType(functionsText[i])
    if (type === 'affect') {
      affects.push(funs)
    } else if (type !== 'unknown') {
      const values = typeToValues(type)
      functionsTypeValues.push({ type, funs, values })
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
  return await Promise.all(
    functionsTypeValues.map(({ index, type, funs, values }) =>
      sendToPlotter(index, { index, type, funs, values, affects, ...options })
    )
  )
}
