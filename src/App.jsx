import { useState } from 'react'
import { Graphit } from './Graphit'
import './App.css'
import themes from './themes'
import { useEffect } from 'react'

const getParams = () => {
  const hash = window.location.hash.slice(1)
  const params = new URLSearchParams('?' + hash)
  return {
    fun:
      params.get('fun') ||
      'y = sin(pow(x, 4))/x ; y = cos(pow(2, sin(x**2))) ; r = cos(o) * sin(o); { x = cos(3*t)*.75, y = sin(2*t)*.75 }',
    theme: params.get('theme') || 'tango',
  }
}

export function App() {
  const initialParams = getParams()
  const [fun, setFun] = useState(initialParams.fun)
  const [theme, setTheme] = useState(initialParams.theme)
  const [error, setError] = useState(null)

  useEffect(() => {
    const hashChange = () => {
      const { fun, theme } = getParams()
      if (fun) {
        setFun(fun)
      }
      if (theme) {
        setTheme(theme)
      }
    }
    hashChange()
    window.addEventListener('hashchange', hashChange)
    return () => window.removeEventListener('hashchange', hashChange)
  }, [])

  useEffect(() => {
    if (!error) {
      window.history.pushState(
        null,
        null,
        `#fun=${encodeURIComponent(fun)}&theme=${encodeURIComponent(theme)}`
      )
    }
  }, [fun, theme, error])

  return (
    <div className="App" style={{ backgroundColor: themes[theme].background }}>
      <button
        className="theme-switcher"
        onClick={() => {
          const themesNames = Object.keys(themes)
          const index = themesNames.indexOf(theme)
          setTheme(themesNames[(index + 1) % themesNames.length])
        }}
      >
        T
      </button>
      <div className="wrapper">
        <Graphit fun={fun} theme={themes[theme]} onError={setError}></Graphit>
      </div>
      <div className="function">
        <input
          type="text"
          value={fun}
          style={{
            color: error ? themes[theme].error : themes[theme].foreground,
          }}
          onChange={e => setFun(e.target.value)}
        />
      </div>
    </div>
  )
}
