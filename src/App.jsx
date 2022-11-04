import { useState } from 'react'
import { Graphit } from './Graphit'
import './App.css'

const bgColor = '#222'

const colors = [
  '#ff5995',
  '#b6e354',
  '#feed6c',
  '#8cedff',
  '#9e6ffe',
  '#899ca1',
  '#f8f8f2',
  '#505354',
  '#bf4646',
  '#516083',
  '#f92672',
  '#82b414',
  '#fd971f',
  '#56c2d6',
  '#8c54fe',
  '#465457',
]

export function App() {
  const [fun, setFun] = useState('sin(pow(x, 4))/x')
  const [color, setColor] = useState(colors[0])
  const [error, setError] = useState(null)

  return (
    <div className="App" style={{ backgroundColor: bgColor }}>
      <Graphit
        fun={fun}
        color={color}
        bgColor={bgColor}
        onError={setError}
      ></Graphit>
      <div className="function">
        <input
          type="text"
          value={fun}
          className={error ? 'error' : ''}
          onChange={e => setFun(e.target.value)}
        />
      </div>
    </div>
  )
}
