import {
  Welcome,
  ReportJourney,
  RequestProgress,
} from './Journey'

import ResponderCommand from './ResponderCommand'
import VehicleProfile from './VehicleProfile'

import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  useRegisterSW,
} from 'virtual:pwa-register/react'

import {
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  MapPin,
  Plus,
  Radio,
  Satellite,
  Send,
  Trash2,
  TriangleAlert,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react'

import {
  triage,
  encode,
  bytes,
  stages,
  validate,
} from '../shared/core'

import * as db from './store'


/* =========================================================
   HELPERS
   ========================================================= */

const date = (time) =>
  time
    ? new Date(time).toLocaleString()
    : '—'


const short = (id) =>
  id.slice(0, 8).toUpperCase()


const label = (state) =>
  ({
    draft: 'Saved locally',
    pending: 'Queued for delivery',
    blocked: 'Needs attention',
    received: 'Receipt confirmed',
  })[state] || state


async function api(
  path,
  options = {}
) {
  const controller =
    new AbortController()

  const timer = setTimeout(
    () => controller.abort(),
    8000
  )

  try {
    const response = await fetch(
      path,
      {
        ...options,

        signal:
          controller.signal,

        cache: 'no-store',

        headers: {
          'Content-Type':
            'application/json',

          ...options.headers,
        },
      }
    )

    const result =
      await response.json()

    if (!response.ok) {
      const error =
        new Error(
          result.error ||
            'Server unavailable'
        )

      error.status =
        response.status

      throw error
    }

    return result
  } finally {
    clearTimeout(timer)
  }
}


/* =========================================================
   PRIORITY BADGE
   ========================================================= */

function Priority({
  report,
}) {
  const result =
    triage(report)

  return (
    <span
      className={
        'pill priority p' +
        result.rank
      }
    >
      {result.rank === 0 ? (
        <TriangleAlert
          size={13}
        />
      ) : (
        <span className="dot" />
      )}

      {result.priority}
    </span>
  )
}


/* =========================================================
   APP
   ========================================================= */

export default function App() {
  const validTabs = [
    'overview',
    'queue',
    'vehicle',
    'dispatch',
    'lab',
  ]

  const initialTab =
    validTabs.includes(
      location.hash.slice(1)
    )
      ? location.hash.slice(1)
      : 'overview'


  /* =======================================================
     STATE
     ======================================================= */

  const [
    tab,
    setTab,
  ] = useState(initialTab)

  const [
    rows,
    setRows,
  ] = useState([])

  const [
    fatal,
    setFatal,
  ] = useState('')

  const [
    toast,
    setToast,
  ] = useState('')

  const [
    selected,
    setSelected,
  ] = useState(null)

  const [
    form,
    setForm,
  ] = useState(false)

  const [
    network,
    setNetwork,
  ] = useState(
    navigator.onLine
  )

  const [
    forced,
    setForced,
  ] = useState(false)

  const [
    backend,
    setBackend,
  ] = useState(false)

  const [
    auto,
    setAuto,
  ] = useState(
    () =>
      localStorage.getItem(
        'satresq-auto'
      ) !== 'false'
  )

  const [
    busy,
    setBusy,
  ] = useState('')

  const [
    remote,
    setRemote,
  ] = useState([])

  const [
    checked,
    setChecked,
  ] = useState('')

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    filter,
    setFilter,
  ] = useState('All')

  const [
    simulation,
    setSimulation,
  ] = useState(null)

  const [
    scenario,
    setScenario,
  ] = useState(
    'success'
  )

  const [
    simulationRunning,
    setSimulationRunning,
  ] = useState(false)


  const simulationTimer =
    useRef(null)

  const running =
    useRef(false)

  const current =
    useRef({})


  current.current = {
    forced,
    network,
    auto,
  }


  /* =======================================================
     PWA SERVICE WORKER
     ======================================================= */

  const {
    offlineReady: [
      cached,
      setCached,
    ],

    needRefresh: [
      newVersion,
    ],

    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(
      _url,
      registration
    ) {
      if (
        registration?.active
      ) {
        setCached(true)
      }
    },

    onRegisterError() {
      setToast(
        'Offline caching could not be enabled. Check browser permissions.'
      )
    },
  })


  function notify(message) {
    setToast(message)
  }


  /* =======================================================
     LOCAL STORAGE SYNC
     ======================================================= */

  useEffect(() => {
    let mounted = true

    function sync() {
      try {
        const data =
          db.read()

        if (mounted) {
          setRows(data)
          setFatal('')
        }
      } catch (error) {
        setFatal(
          error.message
        )
      }
    }

    sync()

    window.addEventListener(
      'queue-change',
      sync
    )

    window.addEventListener(
      'storage',
      sync
    )


    const online = () =>
      setNetwork(
        navigator.onLine
      )


    window.addEventListener(
      'online',
      online
    )

    window.addEventListener(
      'offline',
      online
    )


    const hashChange = () => {
      const next =
        location.hash.slice(1)

      setTab(
        validTabs.includes(next)
          ? next
          : 'overview'
      )
    }


    window.addEventListener(
      'hashchange',
      hashChange
    )


    return () => {
      mounted = false

      clearTimeout(
        simulationTimer.current
      )

      window.removeEventListener(
        'queue-change',
        sync
      )

      window.removeEventListener(
        'storage',
        sync
      )

      window.removeEventListener(
        'online',
        online
      )

      window.removeEventListener(
        'offline',
        online
      )

      window.removeEventListener(
        'hashchange',
        hashChange
      )
    }
  }, [])


  /* =======================================================
     TOAST TIMER
     ======================================================= */

  useEffect(() => {
    if (!toast) return

    const timer =
      setTimeout(
        () =>
          setToast(''),
        7000
      )

    return () =>
      clearTimeout(timer)
  }, [toast])


  /* =======================================================
     SERVER SYNC
     ======================================================= */

  async function refreshRemote() {
    if (
      current.current.forced ||
      !current.current.network
    ) {
      setBackend(false)
      return
    }

    try {
      const data =
        await api(
          '/api/requests'
        )

      if (
        !Array.isArray(data)
      ) {
        throw new Error(
          'Invalid server response'
        )
      }

      setRemote(data)

      setChecked(
        new Date().toISOString()
      )

      setBackend(true)


      try {
        const locals =
          db.read()

        const changed =
          locals.some(
            (item) => {
              const remoteItem =
                data.find(
                  (entry) =>
                    entry.id ===
                    item.report.id
                )

              return (
                remoteItem &&
                JSON.stringify(
                  remoteItem.packet
                ) ===
                  JSON.stringify(
                    encode(
                      item.report
                    )
                  ) &&
                (
                  item.state !==
                    'received' ||
                  item.server
                    ?.updatedAt !==
                    remoteItem.updatedAt
                )
              )
            }
          )


        if (changed) {
          db.edit(
            (items) =>
              items.map(
                (item) => {
                  const remoteItem =
                    data.find(
                      (
                        entry
                      ) =>
                        entry.id ===
                        item.report.id
                    )


                  if (
                    remoteItem &&
                    JSON.stringify(
                      remoteItem.packet
                    ) ===
                      JSON.stringify(
                        encode(
                          item.report
                        )
                      )
                  ) {
                    return {
                      ...item,

                      state:
                        'received',

                      server:
                        remoteItem,

                      error: null,
                    }
                  }

                  return item
                }
              )
          )
        }
      } catch (error) {
        notify(
          error.message
        )
      }
    } catch {
      setBackend(false)
    }
  }


  useEffect(() => {
    refreshRemote()

    const timer =
      setInterval(
        refreshRemote,
        6000
      )

    return () =>
      clearInterval(timer)
  }, [
    forced,
    network,
  ])


  /* =======================================================
     DELIVERY
     ======================================================= */

  async function deliver(id) {
    if (
      running.current ||
      current.current.forced ||
      !current.current.network
    ) {
      return
    }

    running.current = true

    setBusy(id)


    const work =
      async () => {
        const row =
          db
            .read()
            .find(
              (item) =>
                item.report.id ===
                id
            )


        if (
          !row ||
          row.state !==
            'pending'
        ) {
          return
        }


        const attempts =
          row.attempts + 1


        db.update(
          id,
          (item) =>
            db.event(
              {
                ...item,

                attempts,

                nextTry:
                  Date.now() +
                  Math.min(
                    60000,

                    2000 *
                      2 **
                        Math.min(
                          attempts,
                          5
                        )
                  ),
              },

              `HTTP attempt ${attempts} · compact packet`
            )
        )


        try {
          const result =
            await api(
              '/api/requests',

              {
                method:
                  'POST',

                body:
                  JSON.stringify(
                    encode(
                      row.report
                    )
                  ),
              }
            )


          if (
            result.acknowledged !==
              true ||
            result.request?.id !==
              id ||
            JSON.stringify(
              result.request.packet
            ) !==
              JSON.stringify(
                encode(
                  row.report
                )
              )
          ) {
            throw new Error(
              'Invalid acknowledgement'
            )
          }


          db.update(
            id,

            (item) =>
              db.event(
                {
                  ...item,

                  state:
                    'received',

                  server:
                    result.request,

                  error: null,
                },

                result.duplicate
                  ? 'Existing receipt confirmed; duplicate prevented'
                  : 'Server receipt confirmed'
              )
          )


          setBackend(true)

          refreshRemote()
        } catch (error) {
          const blocked =
            error.status >= 400 &&
            error.status < 500 &&
            ![
              408,
              429,
            ].includes(
              error.status
            )


          db.update(
            id,

            (item) =>
              db.event(
                {
                  ...item,

                  state:
                    blocked
                      ? 'blocked'
                      : 'pending',

                  error:
                    blocked
                      ? error.message
                      : 'Receipt unconfirmed. Retained for retry.',
                },

                blocked
                  ? `Server rejected packet: ${error.message}`
                  : 'Connection or acknowledgement unavailable'
              )
          )


          if (!blocked) {
            setBackend(false)
          }
        }
      }


    try {
      if (
        navigator.locks
      ) {
        await navigator.locks.request(
          'satresq-delivery',

          {
            ifAvailable: true,
          },

          async (lock) => {
            if (lock) {
              await work()
            }
          }
        )
      } else {
        await work()
      }
    } catch (error) {
      notify(
        `Local storage problem: ${error.message}`
      )
    } finally {
      running.current =
        false

      setBusy('')
    }
  }


  /* =======================================================
     AUTOMATIC RETRIES
     ======================================================= */

  useEffect(() => {
    const tick = () => {
      if (
        !current.current.auto
      ) {
        return
      }

      try {
        const next =
          db
            .read()
            .find(
              (item) =>
                item.state ===
                  'pending' &&
                item.nextTry <=
                  Date.now()
            )


        if (next) {
          deliver(
            next.report.id
          )
        }
      } catch {
        // keep retry loop safe
      }
    }


    const timer =
      setInterval(
        tick,
        2500
      )


    return () =>
      clearInterval(timer)
  }, [])


  /* =======================================================
     QUEUE REQUEST
     ======================================================= */

  function queue(id) {
    try {
      db.update(
        id,

        (item) =>
          db.event(
            {
              ...item,

              state:
                'pending',

              nextTry: 0,

              error: null,
            },

            'Delivery authorised; saved for retry'
          )
      )


      if (
        forced ||
        !network
      ) {
        notify(
          'Queued locally. Reconnect to deliver.'
        )
      } else {
        deliver(id)
      }
    } catch (error) {
      notify(
        error.message
      )
    }
  }


  /* =======================================================
     SAVE REQUEST
     ======================================================= */

  function save(
    report,
    send = false
  ) {
    try {
      db.add(report)

      setSelected(
        report.id
      )

      setForm(false)

      setTab('queue')

      setSearch('')

      setFilter('All')


      history.replaceState(
        null,
        '',
        '#queue'
      )


      if (send) {
        queue(
          report.id
        )
      } else {
        notify(
          'Report saved on this device. Send whenever you are ready.'
        )
      }


      return true
    } catch (error) {
      notify(
        error.message
      )

      return false
    }
  }


  /* =======================================================
     DELETE REQUEST
     ======================================================= */

  function remove(id) {
    if (
      !confirm(
        'Remove this report from this browser? Any server copy remains.'
      )
    ) {
      return
    }

    try {
      db.edit(
        (items) =>
          items.filter(
            (item) =>
              item.report.id !==
              id
          )
      )

      setSelected(null)
    } catch (error) {
      notify(
        error.message
      )
    }
  }


  /* =======================================================
     OLD REPORT IMPORT
     ======================================================= */

  function importOld() {
    try {
      const old =
        JSON.parse(
          localStorage.getItem(
            'satresq-latest-report-v1'
          ) || 'null'
        )


      if (!old) {
        throw new Error(
          'No earlier report in this browser and port.'
        )
      }


      db.add(
        validate(old)
      )


      notify(
        'Earlier report imported as a draft. Review before sending.'
      )
    } catch (error) {
      notify(
        error.message
      )
    }
  }


  /* =======================================================
     RESPONDER STATUS UPDATE
     ======================================================= */

  async function advance(
    request
  ) {
    setBusy(
      request.id
    )

    try {
      await api(
        `/api/requests/${request.id}`,

        {
          method: 'PATCH',

          body:
            JSON.stringify({
              stage:
                stages[
                  stages.indexOf(
                    request.stage
                  ) + 1
                ],
            }),
        }
      )


      await refreshRemote()


      notify(
        'Demo responder status updated.'
      )
    } catch (error) {
      notify(
        error.message
      )
    } finally {
      setBusy('')
    }
  }


  /* =======================================================
     SATELLITE SIMULATION
     ======================================================= */

  function simulate(row) {
    if (
      simulationRunning
    ) {
      return
    }


    const packet =
      encode(
        row.report
      )


    if (
      bytes(packet) >
      1024
    ) {
      notify(
        'Packet exceeds the 1,024-byte demonstration limit. Create a shorter report; no data was truncated.'
      )

      return
    }


    setSimulationRunning(
      true
    )


    setSimulation({
      id:
        row.report.id,

      lines: [
        `SIMULATION · compact packet queued (${bytes(
          packet
        )} bytes)`,
      ],

      done: false,
    })


    const addLine =
      (text) => {
        setSimulation(
          (current) => ({
            ...current,

            lines: [
              ...current.lines,
              text,
            ],
          })
        )
      }


    simulationTimer.current =
      setTimeout(
        () => {
          addLine(
            'SIMULATION · searching for a satellite link'
          )


          simulationTimer.current =
            setTimeout(
              () => {
                if (
                  scenario ===
                  'failure'
                ) {
                  addLine(
                    'SIMULATION · link unavailable; no mock delivery'
                  )

                  setSimulationRunning(
                    false
                  )

                  setSimulation(
                    (
                      current
                    ) => ({
                      ...current,

                      done: true,
                    })
                  )

                  return
                }


                addLine(
                  'SIMULATION · mock receiver accepted packet'
                )


                simulationTimer.current =
                  setTimeout(
                    () => {
                      addLine(
                        scenario ===
                          'ack-loss'
                          ? 'SIMULATION · acknowledgement lost; receipt remains uncertain'
                          : 'SIMULATION · mock acknowledgement received'
                      )


                      setSimulationRunning(
                        false
                      )


                      setSimulation(
                        (
                          current
                        ) => ({
                          ...current,

                          done: true,
                        })
                      )
                    },

                    800
                  )
              },

              1000
            )
        },

        600
      )
  }


  /* =======================================================
     CURRENT REQUEST
     ======================================================= */

  const item =
    rows.find(
      (row) =>
        row.report.id ===
        selected
    ) || rows[0]


  const pending =
    rows.filter(
      (row) =>
        row.state ===
        'pending'
    ).length


  const offline =
    forced ||
    !network

  const responderMode =
    tab === 'dispatch'


  /* =======================================================
     SEARCH / FILTER
     ======================================================= */

  const matches =
    (item) => {
      const report =
        item.report || item

      const priority =
        triage(
          report
        ).priority


      const matchesFilter =
        filter === 'All' ||
        priority === filter


      const matchesSearch =
        JSON.stringify(
          report
        )
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )


      return (
        matchesFilter &&
        matchesSearch
      )
    }


  /* =======================================================
     NAVIGATION
     ======================================================= */

  function navigate(key) {
    setTab(key)

    setSearch('')

    setFilter('All')


    history.replaceState(
      null,
      '',
      `#${key}`
    )


    window.scrollTo({
      top: 0,

      behavior: 'smooth',
    })
  }


  /* =======================================================
     UI
     ======================================================= */

  return (
    <div className="shell flow-shell">

      {/* ===================================================
          TOP NAVIGATION
          =================================================== */}

      <header className="flow-nav">

        <a
          className="logo"
          href="#overview"
          onClick={(event) => {
            event.preventDefault()

            navigate(
              'overview'
            )
          }}
        >
          <span className="logo-icon">
            <Zap
              fill="currentColor"
              size={23}
            />
          </span>

          SatResQ

          <span className="logo-dot">
            .
          </span>
        </a>


        <div
          className="app-mode-switch"
          role="group"
          aria-label="SatResQ mode"
        >
          <button
            type="button"
            className={
              'app-mode-option ' +
              (!responderMode
                ? 'active'
                : '')
            }
            aria-pressed={
              !responderMode
            }
            onClick={() =>
              navigate(
                'overview'
              )
            }
          >
            <Zap
              size={15}
            />

            Traveller
          </button>

          <button
            type="button"
            className={
              'app-mode-option ' +
              (responderMode
                ? 'active'
                : '')
            }
            aria-pressed={
              responderMode
            }
            onClick={() =>
              navigate(
                'dispatch'
              )
            }
          >
            <Radio
              size={15}
            />

            Responder
          </button>
        </div>


        {!responderMode ? (
          <nav aria-label="Traveller navigation">

            <button
              className={
                tab ===
                'overview'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                navigate(
                  'overview'
                )
              }
            >
              Home
            </button>


            <button
              className={
                tab ===
                  'queue'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                navigate(
                  'queue'
                )
              }
            >
              My requests

              {pending > 0 && (
                <span className="nav-count">
                  {pending}
                </span>
              )}
            </button>


            <button
              className={
                tab ===
                  'vehicle'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                navigate(
                  'vehicle'
                )
              }
            >
              My vehicle
            </button>


            <details className="tools-menu">

              <summary>
                Demo tools

                <ChevronRight
                  size={14}
                />
              </summary>

              <div>

                <button
                  onClick={(event) => {
                    navigate(
                      'lab'
                    )

                    event.currentTarget
                      .closest(
                        'details'
                      ).open =
                      false
                  }}
                >
                  <Satellite
                    size={17}
                  />

                  Transport lab
                </button>

              </div>

            </details>

          </nav>
        ) : (
          <nav
            className="responder-mode-nav"
            aria-label="Responder navigation"
          >
            <button
              className="active"
              onClick={() =>
                navigate(
                  'dispatch'
                )
              }
            >
              <Radio
                size={15}
              />

              Command centre
            </button>
          </nav>
        )}


        <span
          className={
            'connection ' +
            (
              offline
                ? 'off'
                : ''
            )
          }
        >
          <span className="dot" />

          {offline
            ? 'Offline mode'
            : backend
              ? responderMode
                ? 'Receiver connected'
                : 'SatResQ connected'
              : 'Server unavailable'}
        </span>

      </header>


      <div className="body">

        <main>

          {/* =================================================
              ERRORS
              ================================================= */}

          {fatal && (
            <div className="alert danger">
              {fatal}{' '}

              New reports cannot be safely
              stored until this is resolved.
            </div>
          )}


          {/* =================================================
              PWA UPDATE
              ================================================= */}

          {newVersion && (
            <div className="alert">

              An update is ready. Save your
              draft before reloading.

              <button
                onClick={() =>
                  updateServiceWorker(
                    true
                  )
                }
              >
                Load update
              </button>

            </div>
          )}


          {/* =================================================
              PAGE HEADING
              ================================================= */}

          {tab !==
            'overview' && (
            <div className="page-heading">

              <div>

                <p className="eyebrow">
                  {tab ===
                  'dispatch'
                    ? 'RESPONDER MODE / OPERATIONS'
                    : tab ===
                        'vehicle'
                      ? 'OFFLINE VEHICLE PROFILE'
                      : 'OFFLINE FIRST. ALWAYS PREPARED.'}
                </p>


                <h1>
                  {
                    {
                      queue:
                        'Your requests, kept close.',

                      vehicle:
                        'Your vehicle, ready before the emergency.',

                      dispatch:
                        'Responder Command Centre',

                      lab:
                        'Small packets. Bigger possibilities.',
                    }[tab]
                  }
                </h1>


                <p className="muted">
                  {
                    {
                      queue:
                        'Saved on this device. Delivered only after a confirmed server receipt.',

                      vehicle:
                        'Keep essential vehicle information locally available so roadside reporting can be faster when connectivity is limited.',

                      dispatch:
                        'Incoming traveller requests and response progress, inside the same SatResQ platform.',

                      lab:
                        'Inspect the real wire format, then explore a clearly labelled satellite simulation.',
                    }[tab]
                  }
                </p>

              </div>


              {tab !==
                  'dispatch' &&
                tab !==
                  'vehicle' && (
                <button
                  className="btn primary"
                  onClick={() =>
                    setForm(
                      true
                    )
                  }
                >
                  <Plus
                    size={18}
                  />

                  New request
                </button>
              )}

            </div>
          )}


          {/* =================================================
              HOME
              ================================================= */}

          {tab ===
            'overview' && (
            <Welcome
              cached={cached}
              connected={
                backend &&
                !offline
              }
              rows={rows}
              onStart={() =>
                setForm(
                  true
                )
              }
              onTrack={() =>
                navigate(
                  'queue'
                )
              }
            />
          )}


          {/* =================================================
              VEHICLE PROFILE
              ================================================= */}

          {tab ===
            'vehicle' && (
            <VehicleProfile />
          )}


          {/* =================================================
              SEARCH TOOLBAR
              ================================================= */}

          {(tab ===
            'queue' ||
            tab ===
              'dispatch') && (
            <div className="toolbar">

              <input
                aria-label="Search requests"
                placeholder="Search problem, landmark or request ID…"
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
              />


              <select
                aria-label="Filter priority"
                value={
                  filter
                }
                onChange={(
                  event
                ) =>
                  setFilter(
                    event.target.value
                  )
                }
              >

                {[
                  'All',
                  'Emergency',
                  'Urgent review',
                  'Roadside assistance',
                ].map(
                  (
                    value
                  ) => (
                    <option
                      key={
                        value
                      }
                    >
                      {value}
                    </option>
                  )
                )}

              </select>


              <button
                className="btn secondary"
                onClick={() =>
                  db.download(
                    `satresq-${tab}.json`,

                    tab ===
                      'dispatch'
                      ? remote
                      : rows
                  )
                }
              >
                <Download
                  size={16}
                />

                Export JSON
              </button>

            </div>
          )}


          {/* =================================================
              MY REQUESTS
              ================================================= */}

          {tab ===
            'queue' && (
            <>

              <div className="queue-controls">

                <label>

                  <input
                    type="checkbox"
                    checked={
                      auto
                    }
                    onChange={(
                      event
                    ) => {
                      setAuto(
                        event.target.checked
                      )

                      localStorage.setItem(
                        'satresq-auto',

                        String(
                          event.target.checked
                        )
                      )
                    }}
                  />

                  {' '}
                  Auto-retry authorised
                  requests while this app
                  is open

                </label>


                <button
                  className="text-btn"
                  onClick={
                    importOld
                  }
                >
                  Import earlier prototype
                  report
                </button>

              </div>


              <div className="queue-layout">

                <section className="request-list">

                  {rows
                    .filter(
                      matches
                    )
                    .map(
                      (
                        row
                      ) => (
                        <button
                          key={
                            row.report.id
                          }
                          className={
                            'card request-row ' +
                            (
                              item
                                ?.report
                                .id ===
                              row.report.id
                                ? 'selected'
                                : ''
                            )
                          }
                          onClick={() =>
                            setSelected(
                              row.report.id
                            )
                          }
                        >

                          <div className="section-title">

                            <span className="mono">
                              {short(
                                row.report.id
                              )}
                            </span>


                            <Priority
                              report={
                                row.report
                              }
                            />

                          </div>


                          <h3>
                            {
                              row.report.issue
                            }
                          </h3>


                          <p>
                            <MapPin
                              size={14}
                            />

                            {row.report
                              .landmark ||
                              'Coordinates captured'}
                          </p>


                          <div className="row-bottom">

                            <span>
                              {label(
                                row.state
                              )}
                            </span>

                            <ChevronRight
                              size={16}
                            />

                          </div>

                        </button>
                      )
                    )}


                  {!rows
                    .filter(
                      matches
                    )
                    .length && (
                    <div className="card empty">

                      <FileText />

                      <h3>
                        No matching requests
                      </h3>

                      <p>
                        Create a report or
                        change your filter.
                      </p>

                    </div>
                  )}

                </section>


                {item && (
                  <section className="card detail">

                    <div className="section-title">

                      <h3>
                        Request details
                      </h3>

                      <span className="mono">
                        {short(
                          item.report.id
                        )}
                      </span>

                    </div>


                    <RequestProgress
                      item={item}
                    />


                    <Priority
                      report={
                        item.report
                      }
                    />


                    <h2>
                      {
                        item.report.issue
                      }
                    </h2>


                    <p>
                      {
                        triage(
                          item.report
                        ).help
                      }
                    </p>


                    <p className="muted">
                      {
                        triage(
                          item.report
                        ).reason
                      }
                    </p>


                    <dl>

                      <dt>
                        Vehicle
                      </dt>

                      <dd>
                        {
                          item.report.vehicle
                        }
                      </dd>


                      <dt>
                        Landmark
                      </dt>

                      <dd>
                        {item.report.landmark ||
                          'Not provided'}
                      </dd>


                      <dt>
                        Location
                      </dt>

                      <dd>
                        {item.report.location
                          ? `${
                              item.report
                                .location
                                .latitude
                                .toFixed(
                                  6
                                )
                            }, ${
                              item.report
                                .location
                                .longitude
                                .toFixed(
                                  6
                                )
                            } · ±${Math.round(
                              item.report
                                .location
                                .accuracy
                            )} m`
                          : 'No coordinates'}
                      </dd>


                      {item.report
                        .location && (
                        <>
                          <dt>
                            Captured
                          </dt>

                          <dd>
                            {date(
                              item.report
                                .location
                                .capturedAt
                            )}
                          </dd>
                        </>
                      )}


                      <dt>
                        Notes
                      </dt>

                      <dd>
                        {item.report.notes ||
                          'None'}
                      </dd>


                      <dt>
                        Safety answers
                      </dt>

                      <dd>
                        Danger:{' '}
                        {
                          item.report.danger
                        }

                        ; traffic exposure:{' '}
                        {
                          item.report.exposed
                        }
                      </dd>


                      <dt>
                        Prepared
                      </dt>

                      <dd>
                        {date(
                          item.report.createdAt
                        )}
                      </dd>


                      <dt>
                        HTTP payload
                      </dt>

                      <dd>
                        {bytes(
                          encode(
                            item.report
                          )
                        )}{' '}
                        bytes · compact JSON
                      </dd>

                    </dl>


                    <div className="delivery-box">

                      <span className="eyebrow">
                        DELIVERY STATUS
                      </span>


                      <h3>
                        {busy ===
                        item.report.id
                          ? 'Sending…'
                          : item.state ===
                              'received'
                            ? `${
                                item.server
                                  ?.stage
                              } · demo server`
                            : label(
                                item.state
                              )}
                      </h3>


                      <p>
                        {item.error ||
                          (
                            item.state ===
                            'received'
                              ? 'Server receipt does not indicate real assistance.'
                              : 'Only “Queue & send” authorises transmission. Saving alone does not send.'
                          )}
                      </p>

                    </div>


                    <div className="actions">

                      {item.state !==
                        'received' && (
                        <button
                          className="btn primary"
                          disabled={
                            !!busy ||
                            !!fatal
                          }
                          onClick={() =>
                            queue(
                              item.report.id
                            )
                          }
                        >
                          <Send
                            size={16}
                          />

                          {item.state ===
                          'draft'
                            ? 'Queue & send'
                            : 'Retry now'}
                        </button>
                      )}


                      {item.state ===
                        'pending' && (
                        <button
                          className="btn secondary"
                          disabled={
                            !!busy
                          }
                          onClick={() =>
                            db.update(
                              item.report.id,

                              (
                                row
                              ) =>
                                db.event(
                                  {
                                    ...row,

                                    state:
                                      'draft',
                                  },

                                  'Automatic delivery paused locally'
                                )
                            )
                          }
                        >
                          Pause retries
                        </button>
                      )}


                      <button
                        className="btn secondary"
                        onClick={() => {
                          setSelected(
                            item.report.id
                          )

                          setTab(
                            'lab'
                          )

                          history.replaceState(
                            null,
                            '',
                            '#lab'
                          )
                        }}
                      >
                        <Satellite
                          size={16}
                        />

                        Simulate
                      </button>


                      <button
                        aria-label="Delete local report"
                        className="icon-btn"
                        disabled={
                          !!busy
                        }
                        onClick={() =>
                          remove(
                            item.report.id
                          )
                        }
                      >
                        <Trash2
                          size={17}
                        />
                      </button>

                    </div>


                    <div className="timeline">

                      {[
                        ...(
                          item.events ||
                          []
                        ),
                      ]
                        .reverse()
                        .slice(
                          0,
                          5
                        )
                        .map(
                          (
                            event,
                            index
                          ) => (
                            <div
                              key={
                                index
                              }
                            >

                              <span className="dot" />

                              <p>
                                {
                                  event.text
                                }

                                <small>
                                  {date(
                                    event.at
                                  )}
                                </small>
                              </p>

                            </div>
                          )
                        )}

                    </div>

                  </section>
                )}

              </div>

            </>
          )}


          {/* =================================================
              RESPONDER COMMAND CENTRE
              ================================================= */}

          {tab ===
            'dispatch' && (
            <ResponderCommand
              remote={remote}
              search={search}
              filter={filter}
              backend={backend}
              offline={offline}
              checked={checked}
              busy={busy}
              refreshRemote={
                refreshRemote
              }
              advance={advance}
            />
          )}


          {/* =================================================
              TRANSPORT LAB
              ================================================= */}

          {tab ===
            'lab' && (
            <>

              <div className="alert">

                <Satellite
                  size={18}
                />

                <span>
                  <b>
                    Simulation only.
                  </b>{' '}

                  This lab never sends to the
                  server or changes real
                  delivery status. The actual
                  HTTP path uses the same
                  compact format.
                </span>

              </div>


              {!item ? (

                <div className="card empty">

                  <Satellite
                    size={32}
                  />

                  <h3>
                    Start with a saved report.
                  </h3>

                  <button
                    className="btn primary"
                    onClick={() =>
                      setForm(
                        true
                      )
                    }
                  >
                    Create request
                  </button>

                </div>

              ) : (

                <div className="two-col">

                  <section className="card">

                    <p className="eyebrow">
                      PACKET INSPECTOR
                    </p>


                    <h2>
                      Less data. Same essentials.
                    </h2>


                    <label htmlFor="packet-request">
                      Saved report
                    </label>


                    <select
                      id="packet-request"
                      value={
                        item.report.id
                      }
                      disabled={
                        simulationRunning
                      }
                      onChange={(
                        event
                      ) => {
                        setSelected(
                          event.target.value
                        )

                        setSimulation(
                          null
                        )
                      }}
                    >

                      {rows.map(
                        (
                          row
                        ) => (
                          <option
                            key={
                              row.report.id
                            }
                            value={
                              row.report.id
                            }
                          >
                            {short(
                              row.report.id
                            )}

                            {' · '}

                            {
                              row.report.issue
                            }
                          </option>
                        )
                      )}

                    </select>


                    <div className="packet-stats">

                      <div>

                        <b>
                          {bytes(
                            encode(
                              item.report
                            )
                          )}

                          <small>
                            B
                          </small>
                        </b>

                        <span>
                          Compact payload
                        </span>

                      </div>


                      <div>

                        <b>
                          {Math.round(
                            (
                              1 -
                              bytes(
                                encode(
                                  item.report
                                )
                              ) /
                                bytes(
                                  validate(
                                    item.report
                                  )
                                )
                            ) *
                              100
                          )}

                          <small>
                            %
                          </small>
                        </b>

                        <span>
                          Smaller than descriptive
                          JSON
                        </span>

                      </div>

                    </div>


                    <div className="byte-bar">

                      <span
                        style={{
                          width:
                            Math.min(
                              100,

                              (
                                bytes(
                                  encode(
                                    item.report
                                  )
                                ) /
                                1024
                              ) *
                                100
                            ) +
                            '%',
                        }}
                      />

                    </div>


                    <p className="muted small">
                      {bytes(
                        encode(
                          item.report
                        )
                      )}{' '}
                      / 1,024 bytes · chosen
                      demo limit, not a
                      satellite-provider
                      specification. UTF-8
                      payload only; transport
                      overhead excluded.
                    </p>


                    <details>

                      <summary>
                        Inspect transmitted
                        fields
                      </summary>


                      <pre>
                        {JSON.stringify(
                          encode(
                            item.report
                          ),
                          null,
                          2
                        )}
                      </pre>


                      <p className="small">
                        v: version; id: ID; t:
                        report time; c/i:
                        vehicle/problem codes;
                        d/e: safety answers; l:
                        coordinates, accuracy,
                        capture time; m/n:
                        landmark/notes. No text
                        is truncated.
                      </p>

                    </details>


                    <button
                      className="btn secondary"
                      onClick={() =>
                        db.download(
                          'satresq-packet.json',

                          encode(
                            item.report
                          )
                        )
                      }
                    >
                      <Download
                        size={16}
                      />

                      Export packet
                    </button>

                  </section>


                  <section className="card sim-card">

                    <p className="eyebrow">
                      SATELLITE TRANSPORT / MOCK
                    </p>


                    <h2>
                      Explore the connection.
                    </h2>


                    <div
                      className={
                        'sat-visual ' +
                        (
                          simulationRunning
                            ? 'running'
                            : ''
                        )
                      }
                    >

                      <div />

                      <Satellite
                        size={64}
                      />

                      <span />

                      <small>
                        SOFTWARE SIMULATION
                      </small>

                    </div>


                    <label htmlFor="scenario">
                      Connection scenario
                    </label>


                    <select
                      id="scenario"
                      value={
                        scenario
                      }
                      disabled={
                        simulationRunning
                      }
                      onChange={(
                        event
                      ) =>
                        setScenario(
                          event.target.value
                        )
                      }
                    >

                      <option value="success">
                        Successful delivery +
                        acknowledgement
                      </option>

                      <option value="failure">
                        No satellite link
                      </option>

                      <option value="ack-loss">
                        Delivery simulated,
                        acknowledgement lost
                      </option>

                    </select>


                    <button
                      className="btn primary full"
                      disabled={
                        simulationRunning
                      }
                      onClick={() =>
                        simulate(
                          item
                        )
                      }
                    >
                      <Satellite
                        size={17}
                      />

                      {simulationRunning
                        ? 'Simulation running…'
                        : 'Run simulation'}
                    </button>


                    {simulation && (
                      <div
                        className="sim-log"
                        role="status"
                      >

                        <small>
                          REQUEST{' '}
                          {short(
                            simulation.id
                          )}
                        </small>


                        {simulation.lines.map(
                          (
                            line,
                            index
                          ) => (
                            <p
                              key={
                                index
                              }
                            >
                              <ChevronRight
                                size={13}
                              />

                              {line}
                            </p>
                          )
                        )}

                      </div>
                    )}

                  </section>

                </div>
              )}

            </>
          )}


          {/* =================================================
              FOOTER
              ================================================= */}

          <footer>

            <span>
              ASTRAVEX
              <i> / </i>
              SatResQ Pro
            </span>


            <span>
              Rule-based triage · Local demo
              · No real dispatch
            </span>


            <button
              className={
                'offline-toggle ' +
                (
                  forced
                    ? 'enabled'
                    : ''
                )
              }
              onClick={() =>
                setForced(
                  !forced
                )
              }
            >
              {forced ? (
                <WifiOff
                  size={14}
                />
              ) : (
                <Wifi
                  size={14}
                />
              )}

              {forced
                ? 'Exit offline demo'
                : 'Test offline mode'}
            </button>

          </footer>

        </main>

      </div>


      {/* =====================================================
          TOAST
          ===================================================== */}

      {toast && (
        <div
          className="toast"
          role="status"
        >

          <CheckCircle2
            size={19}
          />

          <span>
            {toast}
          </span>

          <button
            aria-label="Dismiss message"
            onClick={() =>
              setToast('')
            }
          >
            <X
              size={16}
            />
          </button>

        </div>
      )}


      {/* =====================================================
          REPORT FORM
          ===================================================== */}

      {form && (
        <ReportJourney
          onClose={() =>
            setForm(false)
          }
          onSave={save}
        />
      )}

    </div>
  )
}