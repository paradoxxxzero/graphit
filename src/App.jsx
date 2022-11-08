import { useState } from 'react'
import { Graphit } from './Graphit'
import './App.css'
import themes from './themes'
import { useEffect } from 'react'
import { useCallback } from 'react'
import { getFunctionType, getValuesForType, allocate } from './utils'
import Plotter from './plotter.worker.js?worker'

const workers = []

const getParams = () => {
  const hash = window.location.hash.slice(1)
  const params = new URLSearchParams('?' + atob(hash))
  return {
    fun:
      params.get('fun') ||
      'y = sin(pow(x, 4))/x ; y = cos(pow(2, sin(x**2))) ; r = cos(o) * sin(o); { x = cos(3*t)*.75, y = sin(2*t)*.75 }',
    theme: params.get('theme') || 'tango',
    duration: parseFloat(params.get('duration') || 1),
    sampleRate: ~~(params.get('sampleRate') || 44100),
  }
}

export function App() {
  const initialParams = getParams()
  const [fun, setFun] = useState(initialParams.fun)
  const [theme, setTheme] = useState(initialParams.theme)
  const [error, setError] = useState(null)
  const [audioContext, setAudioContext] = useState(null)
  const [masterGain, setMasterGain] = useState(null)
  const [duration, setDuration] = useState(initialParams.duration)
  const [sampleRate, setSampleRate] = useState(initialParams.sampleRate)
  const [loop, setLoop] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [region, setRegion] = useState([
    [0, 0],
    [0, 0],
  ])

  const toggleSettings = useCallback(() => {
    setSettingsOpen(!settingsOpen)
  }, [settingsOpen])

  const nextTheme = useCallback(() => {
    const themesNames = Object.keys(themes)
    const index = themesNames.indexOf(theme)
    setTheme(themesNames[(index + 1) % themesNames.length])
  }, [theme])

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
        `#${btoa(
          `fun=${encodeURIComponent(fun)}&theme=${encodeURIComponent(
            theme
          )}&duration=${duration}&sampleRate=${sampleRate}`
        )}`
      )
    }
  }, [fun, theme, error, duration, sampleRate])

  const playAudio = useCallback(async () => {
    let ctx = audioContext,
      master = masterGain
    if (!ctx) {
      ctx = new AudioContext()
      master = ctx.createGain()
      setAudioContext(ctx)
      setMasterGain(master)
      const dynamicsCompressor = ctx.createDynamicsCompressor()
      master.connect(dynamicsCompressor)
      dynamicsCompressor.connect(ctx.destination)
    }

    const count = duration * sampleRate

    const errors = []
    const data = await Promise.all(
      fun.split(';').map(
        (fun, i) =>
          new Promise(resolve => {
            let type, values, functions
            try {
              ;({ type, functions } = getFunctionType(fun))
              if (type !== 'linear') {
                resolve()
                return
              }
              values = allocate(count)
              for (let j = 0; j < count; j++) {
                values[j] = (j * duration) / sampleRate
              }
            } catch (e) {
              errors.push(e)
              return
            }
            if (!workers[i]) {
              workers[i] = new Plotter()
            }

            const plotter = workers[i]
            plotter.postMessage({
              index: i,
              type,
              functions,
              values,
              dimensions: 1,
            })
            plotter.onmessage = ({ data }) => resolve(data)
          })
      )
    )

    for (let i = 0; i < data.length; i++) {
      if (!data[i]) continue
      const { values, err } = data[i]
      if (err) {
        errors.push(err)
        continue
      }
      const buffer = ctx.createBuffer(1, count, sampleRate)
      // Can we remove the copy?
      buffer.copyToChannel(values, 0)

      const attack = 0.001
      const release = 0.001
      const gain = ctx.createGain()
      gain.connect(master)

      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + attack)
      gain.gain.setValueAtTime(1, ctx.currentTime + attack)
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + duration - release)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = loop
      source.onended = () => {
        gain.disconnect(master)
        source.disconnect(gain)
      }
      source.connect(gain)
      source.start()
    }
    setRegion([
      [0, duration],
      [-1, 1],
    ])
  }, [audioContext, duration, fun, loop, masterGain, sampleRate])

  useEffect(() => {
    if (audioContext) {
      masterGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.01)
    }
  }, [audioContext, masterGain, volume])

  return (
    <div className="App" style={{ backgroundColor: themes[theme].background }}>
      <div className="controls">
        <button onClick={nextTheme}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M12 22q-2.05 0-3.875-.788q-1.825-.787-3.187-2.15q-1.363-1.362-2.15-3.187Q2 14.05 2 12q0-2.075.812-3.9q.813-1.825 2.201-3.175Q6.4 3.575 8.25 2.787Q10.1 2 12.2 2q2 0 3.775.688q1.775.687 3.112 1.9q1.338 1.212 2.125 2.875Q22 9.125 22 11.05q0 2.875-1.75 4.412Q18.5 17 16 17h-1.85q-.225 0-.312.125q-.088.125-.088.275q0 .3.375.862q.375.563.375 1.288q0 1.25-.688 1.85q-.687.6-1.812.6Zm-5.5-9q.65 0 1.075-.425Q8 12.15 8 11.5q0-.65-.425-1.075Q7.15 10 6.5 10q-.65 0-1.075.425Q5 10.85 5 11.5q0 .65.425 1.075Q5.85 13 6.5 13Zm3-4q.65 0 1.075-.425Q11 8.15 11 7.5q0-.65-.425-1.075Q10.15 6 9.5 6q-.65 0-1.075.425Q8 6.85 8 7.5q0 .65.425 1.075Q8.85 9 9.5 9Zm5 0q.65 0 1.075-.425Q16 8.15 16 7.5q0-.65-.425-1.075Q15.15 6 14.5 6q-.65 0-1.075.425Q13 6.85 13 7.5q0 .65.425 1.075Q13.85 9 14.5 9Zm3 4q.65 0 1.075-.425Q19 12.15 19 11.5q0-.65-.425-1.075Q18.15 10 17.5 10q-.65 0-1.075.425Q16 10.85 16 11.5q0 .65.425 1.075Q16.85 13 17.5 13Z"
            />
          </svg>
        </button>
        <button onClick={playAudio}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="m9.5 16.5l7-4.5l-7-4.5ZM12 22q-2.075 0-3.9-.788q-1.825-.787-3.175-2.137q-1.35-1.35-2.137-3.175Q2 14.075 2 12t.788-3.9q.787-1.825 2.137-3.175q1.35-1.35 3.175-2.138Q9.925 2 12 2t3.9.787q1.825.788 3.175 2.138q1.35 1.35 2.137 3.175Q22 9.925 22 12t-.788 3.9q-.787 1.825-2.137 3.175q-1.35 1.35-3.175 2.137Q14.075 22 12 22Z"
            />
          </svg>
        </button>
        <button onClick={toggleSettings}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="m9.25 22l-.4-3.2q-.325-.125-.612-.3q-.288-.175-.563-.375L4.7 19.375l-2.75-4.75l2.575-1.95Q4.5 12.5 4.5 12.337v-.675q0-.162.025-.337L1.95 9.375l2.75-4.75l2.975 1.25q.275-.2.575-.375q.3-.175.6-.3l.4-3.2h5.5l.4 3.2q.325.125.613.3q.287.175.562.375l2.975-1.25l2.75 4.75l-2.575 1.95q.025.175.025.337v.675q0 .163-.05.338l2.575 1.95l-2.75 4.75l-2.95-1.25q-.275.2-.575.375q-.3.175-.6.3l-.4 3.2Zm2.8-6.5q1.45 0 2.475-1.025Q15.55 13.45 15.55 12q0-1.45-1.025-2.475Q13.5 8.5 12.05 8.5q-1.475 0-2.488 1.025Q8.55 10.55 8.55 12q0 1.45 1.012 2.475Q10.575 15.5 12.05 15.5Z"
            />
          </svg>
        </button>
      </div>
      <div className="wrapper">
        <Graphit
          fun={fun}
          theme={themes[theme]}
          region={region}
          onRegion={setRegion}
          onError={setError}
        ></Graphit>
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
      {settingsOpen ? (
        <div className="modal settings">
          <div className="modal-overlay" onClick={toggleSettings} />
          <div className="modal-content">
            <div className="modal-header">
              <h2>Settings</h2>
              <button className="modal-close" onClick={toggleSettings}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  preserveAspectRatio="xMidYMid meet"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6Z"
                  />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <h2>Appearance</h2>
              <div className="form-group">
                <label htmlFor="theme">Theme</label>
                <select
                  name="theme"
                  id="theme"
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                >
                  {Object.keys(themes).map(key => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
              <h2>Audio</h2>
              <div className="form-group">
                <label htmlFor="duration">Duration</label>
                <input
                  type="number"
                  name="duration"
                  step={0.1}
                  value={duration}
                  onChange={e => setDuration(parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="sampleRate">Sample Rate</label>
                <input
                  type="number"
                  name="sampleRate"
                  value={sampleRate}
                  onChange={e => setSampleRate(~~e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="volume">Volume</label>
                <input
                  type="number"
                  name="volume"
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={e => setVolume(parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="loop">Loop</label>
                <input
                  type="checkbox"
                  name="loop"
                  checked={loop}
                  onChange={e => setLoop(e.target.checked)}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
