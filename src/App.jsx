import { autocompletion } from '@codemirror/autocomplete'
import { tooltips, keymap } from '@codemirror/view'
import { Prec } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { tags as t } from '@lezer/highlight'
import { createTheme } from '@uiw/codemirror-themes'
import CodeMirror from '@uiw/react-codemirror'
import qs from 'qs'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import './App.css'
import { Audio } from './Audio'
import doc from './doc'
import { Graphit } from './Graphit'
import { plotFunctions } from './plotter'
import { Spectrogram } from './Spectrogram'
import themes from './themes'
import { DEFAULT_SAMPLE_RATE } from './base'
import { regionEquals } from './utils'
import { acceptCompletion } from '@codemirror/autocomplete'

const qsOptions = { ignoreQueryPrefix: true, addQueryPrefix: true }

const initialState = {
  theme: 'tango',
  lineWidth: 1.5,
  volume: 0.5,
  region: null,
  functions:
    'y = sin(pow(x, 4))/x ; x = cos(pow(2, sin(y**2))) \nr = .1 * (exp(sin(o)) - 2 * cos(4*o) + sin(o/12)) @ 0 -> 24*pi @! pi*1000 \nk = .75; { x = k*cos(3*t), y = k*sin(2*t) } @ 0 -> 2*pi @! 1000',
}

const initialType = {
  theme: 'string',
  lineWidth: 'float',
  volume: 'float',
  region: 'region',
  functions: 'string',
}

const formatKey = (key, value) => {
  switch (initialType[key]) {
    case 'float':
      return parseFloat(value)
    case 'bool':
      return value === 'true'
    case 'region':
      return value.map(minmax => minmax.map(parseFloat))
    default:
      return value
  }
}

const getInitialState = () => {
  if (window.location.search) {
    const parsed = qs.parse(window.location.search, qsOptions)
    return Object.keys(initialState).reduce((acc, key) => {
      acc[key] = parsed[key] ? formatKey(key, parsed[key]) : initialState[key]
      return acc
    }, {})
  }
  return initialState
}

function reducer(state, action) {
  switch (action.type) {
    case 'functions':
      return { ...state, functions: action.functions }
    case 'theme':
      return { ...state, theme: action.theme }
    case 'nextTheme':
      const themesNames = Object.keys(themes)
      const index = themesNames.indexOf(state.theme)
      return { ...state, theme: themesNames[(index + 1) % themesNames.length] }
    case 'lineWidth':
      if (!action.lineWidth) {
        return state
      }
      return { ...state, lineWidth: formatKey('lineWidth', action.lineWidth) }
    case 'volume':
      if (!action.volume) {
        return state
      }
      return { ...state, volume: formatKey('volume', action.volume) }
    case 'region':
      const region = formatKey('region', action.region)
      if (!regionEquals(region, state.region)) {
        if (
          region[0][1] <= region[0][0] ||
          region[1][1] <= region[1][0] ||
          region.flat().some(r => isNaN(r))
        ) {
          console.error('Broken region', region)
          return state
        }
        return { ...state, region }
      } else {
        return state
      }
    default:
      throw new Error("Unknown action type: '" + action.type + "'")
  }
}
function debounce(func, timeout = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      func.apply(this, args)
    }, timeout)
  }
}
const pushState = debounce(state => {
  if (state.region) {
    const newQuery = qs.stringify(state, qsOptions)
    if (newQuery !== window.location.search) {
      window.history.pushState(null, null, newQuery)
    }
  }
}, 100)

function urlMiddleware(reducer) {
  return (state, action) => {
    if (action.type === 'all') {
      Object.keys(initialState).forEach(key => {
        state = reducer(state, { type: key, [key]: action[key] })
      })
    } else {
      state = reducer(state, action)

      if (state.region) {
        pushState(state)
      }
    }
    return state
  }
}
function plotCompletions(context) {
  let word = context.matchBefore(/[\w@$/!]+/)
  if (word.from === word.to && !context.explicit) return null
  return {
    from: word.from,
    options: Object.entries(doc)
      .map(([type, docs]) =>
        Object.entries(docs).map(([label, info]) => ({
          label,
          type,
          info,
        }))
      )
      .flat(),
  }
}

export function App() {
  const [errors, setErrors] = useState([])
  const [audio, setAudio] = useState(null)
  const [currentPreferredRegion, setCurrentPreferredRegion] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [state, dispatch] = useReducer(
    urlMiddleware(reducer),
    getInitialState()
  )
  const [functionsText, setFunctionsText] = useState('')
  const [playAudio, setPlayAudio] = useState(null)
  const [recordAudio, setRecordAudio] = useState(null)
  const [spectrograms, setSpectrograms] = useState([])
  const [displaySpectrogram, setDisplaySpectrogram] = useState(false)
  const [microphone, setMicrophone] = useState(null)
  const [recording, setRecording] = useState(null)
  const [recordings, setRecordings] = useState([])
  const [saveUrl, setSaveUrl] = useState(null)
  const wrapperRef = useRef()
  const codeRef = useRef()

  const handleRegion = useCallback(region => {
    dispatch({ type: 'region', region })
  }, [])

  const handleResetRegion = useCallback(() => {
    dispatch({ type: 'region', region: currentPreferredRegion })
  }, [currentPreferredRegion])

  const handleFunctions = useCallback(
    async functions => {
      setFunctionsText(functions)
      let match,
        evalFunctions = functions
      if ((match = functions.match(/(.+)@@.+$/))) {
        evalFunctions = match[1]
      }

      const data = await plotFunctions(
        evalFunctions,
        state.region,
        recordings,
        'check'
      )
      const errors = data.map(d => d.err).filter(x => x)
      if (errors.length) {
        console.warn(...errors)
        setErrors(errors)
        setAudio(false)
        return
      }
      const preferredRegion = data.reduce((acc, { preferredRegion }) => {
        if (preferredRegion) {
          if (acc) {
            return [
              [
                Math.min(acc[0][0], preferredRegion[0][0]),
                Math.max(acc[0][1], preferredRegion[0][1]),
                Math.max(acc[0][2], preferredRegion[0][2]),
              ],
              [
                Math.min(acc[1][0], preferredRegion[1][0]),
                Math.max(acc[1][1], preferredRegion[1][1]),
                Math.max(acc[1][2], preferredRegion[1][2]),
              ],
            ]
          } else {
            return preferredRegion
          }
        }
        return acc
      }, null)
      if (
        preferredRegion &&
        (!currentPreferredRegion ||
          !regionEquals(currentPreferredRegion, preferredRegion))
      ) {
        setCurrentPreferredRegion(preferredRegion)
        if (currentPreferredRegion) {
          dispatch({ type: 'region', region: preferredRegion })
        }
      }

      setAudio(data.some(({ type }) => type === 'sound'))
      if (functions !== state.functions) {
        dispatch({ type: 'functions', functions })
      }
      setErrors([])
    },
    [currentPreferredRegion, recordings, state.functions, state.region]
  )

  useEffect(() => {
    if (state.region && functionsText !== state.functions) {
      handleFunctions(state.functions)
    }
    // Run only when state.functions changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.functions, state.region])

  const theme = themes[state.theme]

  const cmTheme = useMemo(
    () =>
      createTheme({
        theme: 'light',
        settings: {
          background: theme.overlay,
          foreground: theme.foreground,
          caret: theme.tick,
          selection: 'rgba(125, 125, 125, 0.3)',
          selectionMatch: 'rgba(125, 125, 125, 0.15)',
          fontFamily: '"Fira Code", "Source Code Pro", monospace',
        },
        styles: [
          { tag: t.variableName, color: theme.colors[13] },
          { tag: [t.string, t.special(t.brace)], color: theme.colors[1] },
          { tag: t.number, color: theme.colors[2] },
          { tag: t.bool, color: theme.colors[3] },
          { tag: t.null, color: theme.colors[4] },
          { tag: t.keyword, color: theme.colors[5] },
          { tag: t.operator, color: theme.colors[6] },
          { tag: t.className, color: theme.colors[7] },
          { tag: t.definition(t.typeName), color: theme.colors[8] },
          { tag: t.typeName, color: theme.colors[9] },
          { tag: t.angleBracket, color: theme.colors[10] },
          { tag: t.tagName, color: theme.colors[11] },
          { tag: t.attributeName, color: theme.colors[12] },
          { tag: t.comment, color: theme.colors[14] },
        ],
      }),
    [theme]
  )

  const themeVars = useMemo(
    () => ({
      '--background': theme.background,
      '--overlay': theme.overlay,
      '--foreground': theme.foreground,
      '--error': theme.error,
      '--axis': theme.axis,
      '--tick': theme.tick,
      ...Object.fromEntries(
        theme.colors.map((color, i) => [`--color-${i}`, color])
      ),
    }),
    [theme]
  )

  const toggleSettings = useCallback(() => {
    setSettingsOpen(settingsOpen => !settingsOpen)
  }, [])

  const toggleSpectrogram = useCallback(() => {
    setDisplaySpectrogram(displaySpectrogram => !displaySpectrogram)
  }, [])

  const handleSetPlayAudio = useCallback(playAudio => {
    setPlayAudio(() => async () => {
      const url = await playAudio()
      setSaveUrl(url)
    })
  }, [])

  const handleSetRecordAudio = useCallback(recordAudio => {
    setRecordAudio(() => stream => recordAudio(stream))
  }, [])

  const handleMicClick = useCallback(async () => {
    const hadMicrophone = !!microphone
    if (
      !microphone ||
      microphone.getAudioTracks().some(track => track.readyState === 'ended')
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        })
        setMicrophone(stream)
        if (hadMicrophone) {
          handleMicClick()
        }
      } catch (e) {
        console.warn(e)
      }
    } else {
      if (!recording) {
        const stopRecording = await recordAudio(microphone)
        setRecording(() => () => stopRecording())
      } else {
        const { sampleRate, data } = await recording()
        setRecording(null)
        if (data.length) {
          const recDuration = data.length / sampleRate

          const n = recordings.length + 1
          setRecordings([
            ...recordings,
            { buffer: data, sampleRate: sampleRate },
          ])
          const newFunctionsText = `${functionsText.trim()}${
            functionsText.trim() && ' ; '
          }s(${recDuration.toFixed(6).replace(/\.?0*$/, '')}${
            sampleRate !== DEFAULT_SAMPLE_RATE ? `, ${sampleRate}` : ''
          }) = $rec${n}(t)`
          if (functionsText === state.functions || functionsText === '') {
            dispatch({ type: 'functions', functions: newFunctionsText })
          }
          setFunctionsText(newFunctionsText)
        }
      }
    }
  }, [
    functionsText,
    microphone,
    recordAudio,
    recording,
    recordings,
    state.functions,
  ])

  useLayoutEffect(() => {
    const popstate = () => {
      const queryString = qs.parse(window.location.search, qsOptions)
      Object.keys(queryString).length &&
        dispatch({ type: 'all', ...queryString })
    }
    window.addEventListener('popstate', popstate)
    return () => window.removeEventListener('popstate', popstate)
  }, [])

  return (
    <div className="App" style={themeVars}>
      <div className="controls">
        <button className="button" onClick={toggleSettings}>
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
        <button
          className="button"
          onClick={() => dispatch({ type: 'nextTheme' })}
        >
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
        <button className="button" onClick={handleResetRegion}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 24 24"
          >
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m15 15l6 6m-6-6v4.8m0-4.8h4.8M9 19.8V15m0 0H4.2M9 15l-6 6M15 4.2V9m0 0h4.8M15 9l6-6M9 4.2V9m0 0H4.2M9 9L3 3"
            />
          </svg>
        </button>
        {audio && playAudio ? (
          <button className="button" onClick={playAudio}>
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
        ) : null}
        {audio && recordAudio ? (
          <button className="button" onClick={handleMicClick}>
            {microphone ? (
              recording ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  preserveAspectRatio="xMidYMid meet"
                  viewBox="0 0 24 24"
                  style={{ color: 'red' }}
                >
                  <path
                    fill="currentColor"
                    d="M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 0 0 0-17ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12Zm6-2.5A1.5 1.5 0 0 1 9.5 8h5A1.5 1.5 0 0 1 16 9.5v5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 14.5v-5Z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  preserveAspectRatio="xMidYMid meet"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M12 18a6 6 0 1 0 0-12a6 6 0 0 0 0 12Zm0-16C6.477 2 2 6.477 2 12s4.477 10 10 10s10-4.477 10-10S17.523 2 12 2ZM3.5 12a8.5 8.5 0 1 1 17 0a8.5 8.5 0 0 1-17 0Z"
                  />
                </svg>
              )
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                preserveAspectRatio="xMidYMid meet"
                viewBox="0 0 32 32"
              >
                <path
                  fill="currentColor"
                  d="M23 14v3a7 7 0 0 1-14 0v-3H7v3a9 9 0 0 0 8 8.94V28h-4v2h10v-2h-4v-2.06A9 9 0 0 0 25 17v-3Z"
                />
                <path
                  fill="currentColor"
                  d="M16 22a5 5 0 0 0 5-5V7a5 5 0 0 0-10 0v10a5 5 0 0 0 5 5Z"
                />
              </svg>
            )}
          </button>
        ) : null}
        {spectrograms.length ? (
          <button className="button" onClick={toggleSpectrogram}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1em"
              height="1em"
              preserveAspectRatio="xMidYMid meet"
              viewBox="0 0 32 32"
            >
              <path
                fill="currentColor"
                d="m20.476 8.015l-7.029-3.804a2.008 2.008 0 0 0-2.115.205L4 10.001V2H2v26a2 2 0 0 0 2 2h26V5.735ZM28 20.21l-7.62 1.802l-7.029-2.884a1.99 1.99 0 0 0-2.022.37L4 25.836V21.38l8.375-9.4l7.019 5.62a2.015 2.015 0 0 0 2.046.212l6.56-3.21ZM12.524 5.985l7.03 3.804a2.012 2.012 0 0 0 1.34.16L28 8.265v4.113l-7.381 3.642L13.6 10.4a1.99 1.99 0 0 0-2.688.264L4 18.384v-5.87ZM4.55 28l8.069-7.011l7.029 2.884a1.998 1.998 0 0 0 1.147.077L28 22.26V28Z"
              />
            </svg>
          </button>
        ) : null}
        {saveUrl ? (
          <a
            className="button"
            href={saveUrl}
            download={`graphit-${new Date().getTime()}.wav`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1em"
              height="1em"
              preserveAspectRatio="xMidYMid meet"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M6.75 3h-1A2.75 2.75 0 0 0 3 5.75v12.5A2.75 2.75 0 0 0 5.75 21H6v-6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 15v6h.25A2.75 2.75 0 0 0 21 18.25V8.286a3.25 3.25 0 0 0-.952-2.299l-2.035-2.035A3.25 3.25 0 0 0 15.75 3v4.5a2.25 2.25 0 0 1-2.25 2.25H9A2.25 2.25 0 0 1 6.75 7.5V3Zm7.5 0v4.5a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75V3h6Zm2.25 18v-6a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0-.75.75v6h9Z"
              />
            </svg>
          </a>
        ) : null}
      </div>
      <div className="wrapper" ref={wrapperRef}>
        <Graphit
          functions={state.functions}
          theme={theme}
          region={state.region}
          recordings={recordings}
          lineWidth={state.lineWidth}
          onRegion={handleRegion}
          hide={displaySpectrogram}
          codeRef={codeRef}
        />
        {audio ? (
          <Audio
            functions={state.functions}
            theme={theme}
            volume={state.volume}
            recordings={recordings}
            setPlayAudio={handleSetPlayAudio}
            setRecordAudio={handleSetRecordAudio}
            setSpectrograms={setSpectrograms}
          />
        ) : null}
        {displaySpectrogram && (
          <Spectrogram data={spectrograms} theme={theme} />
        )}
      </div>
      <div className={`function${errors.length ? ' error' : ''}`} ref={codeRef}>
        {errors.length > 0 ? (
          <pre className="errors">{errors.map(e => e.message).join(', ')}</pre>
        ) : null}
        <div className="functionsText">
          <CodeMirror
            value={functionsText}
            basicSetup={{
              foldGutter: false,
              lineNumbers: false,
              highlightActiveLine: false,
              indentOnInput: false,
            }}
            theme={cmTheme}
            extensions={[
              javascript({ jsx: true }),
              autocompletion({ override: [plotCompletions] }),
              tooltips({ parent: document.body }),
              Prec.highest(
                keymap.of([
                  {
                    key: 'Tab',
                    run: view => {
                      acceptCompletion(view)
                      return true
                    },
                  },
                ])
              ),
            ]}
            onChange={handleFunctions}
          />
          <button onClick={() => setFunctionsText('')}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1em"
              height="1em"
              preserveAspectRatio="xMidYMid meet"
              viewBox="0 0 24 24"
              style={{ color: theme.foreground }}
            >
              <path
                fill="currentColor"
                d="M17.414 6.586a2 2 0 0 0-2.828 0L12 9.172L9.414 6.586a2 2 0 1 0-2.828 2.828L9.171 12l-2.585 2.586a2 2 0 1 0 2.828 2.828L12 14.828l2.586 2.586c.39.391.902.586 1.414.586s1.024-.195 1.414-.586a2 2 0 0 0 0-2.828L14.829 12l2.585-2.586a2 2 0 0 0 0-2.828z"
              />
            </svg>
          </button>
        </div>
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
                  value={state.theme}
                  onChange={e =>
                    dispatch({ type: 'theme', theme: e.target.value })
                  }
                >
                  {Object.keys(themes).map(key => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="lineWidth">Line Width</label>
                <input
                  type="number"
                  name="lineWidth"
                  min={0}
                  step={0.1}
                  value={state.lineWidth}
                  onChange={e =>
                    dispatch({ type: 'lineWidth', lineWidth: e.target.value })
                  }
                />
              </div>
              <h2>Audio</h2>
              <div className="form-group">
                <label htmlFor="volume">Master Volume</label>
                <input
                  type="number"
                  name="volume"
                  min={0}
                  max={1}
                  step={0.1}
                  value={state.volume}
                  onChange={e =>
                    dispatch({ type: 'volume', volume: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
