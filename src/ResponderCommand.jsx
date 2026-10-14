import { useState } from 'react'

import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Radio,
  RefreshCw,
  ShieldCheck,
  Signal,
  TriangleAlert,
  Camera,
  Mic,
  Paperclip,
  LoaderCircle,
} from 'lucide-react'

import {
  bytes,
  stages,
  triage,
} from '../shared/core'

import {
  fetchRemoteMedia,
} from './mediaSync'

const date = (value) =>
  value
    ? new Date(value).toLocaleString()
    : '—'

const short = (id) =>
  id.slice(0, 8).toUpperCase()

function Priority({ report }) {
  const result = triage(report)

  return (
    <span
      className={
        'pill priority p' + result.rank
      }
    >
      {result.rank === 0 ? (
        <TriangleAlert size={13} />
      ) : (
        <span className="dot" />
      )}

      {result.priority}
    </span>
  )
}

function Stat({
  icon: Icon,
  number,
  label,
}) {
  return (
    <div className="command-stat">
      <div>
        <span>{label}</span>

        <Icon size={18} />
      </div>

      <strong>{number}</strong>
    </div>
  )
}

function requestAge(receivedAt) {
  if (!receivedAt) return 'Unknown'

  const difference = Math.max(
    0,
    Date.now() -
      Date.parse(receivedAt)
  )

  const minutes = Math.floor(
    difference / 60000
  )

  if (minutes < 1) {
    return 'Just now'
  }

  if (minutes < 60) {
    return `${minutes} min ago`
  }

  const hours = Math.floor(
    minutes / 60
  )

  const remaining =
    minutes % 60

  if (hours < 24) {
    return remaining
      ? `${hours}h ${remaining}m ago`
      : `${hours}h ago`
  }

  const days = Math.floor(
    hours / 24
  )

  return `${days}d ago`
}

export default function ResponderCommand({
  remote,
  search,
  filter,
  backend,
  offline,
  checked,
  busy,
  refreshRemote,
  advance,
}) {
  const [mediaById, setMediaById] =
    useState({})

  const [mediaOpen, setMediaOpen] =
    useState({})

  const [mediaBusy, setMediaBusy] =
    useState('')

  const [mediaErrors, setMediaErrors] =
    useState({})


  async function toggleEvidence(
    request
  ) {
    const id = request.id

    if (mediaOpen[id]) {
      setMediaOpen(
        (current) => ({
          ...current,
          [id]: false,
        })
      )

      return
    }


    setMediaOpen(
      (current) => ({
        ...current,
        [id]: true,
      })
    )


    if (
      mediaById[id] ||
      !(
        request.media?.photo ||
        request.media?.voice
      )
    ) {
      return
    }


    setMediaBusy(id)

    setMediaErrors(
      (current) => ({
        ...current,
        [id]: '',
      })
    )


    try {
      const result =
        await fetchRemoteMedia(id)

      setMediaById(
        (current) => ({
          ...current,
          [id]: result,
        })
      )
    } catch (error) {
      setMediaErrors(
        (current) => ({
          ...current,
          [id]:
            error.message ||
            'Could not load evidence',
        })
      )
    } finally {
      setMediaBusy('')
    }
  }

  const visibleRequests = [
    ...remote,
  ]
    .filter((request) => {
      const priority =
        triage(request).priority

      const matchesPriority =
        filter === 'All' ||
        priority === filter

      const matchesSearch =
        JSON.stringify(request)
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )

      return (
        matchesPriority &&
        matchesSearch
      )
    })
    .sort(
      (a, b) =>
        Date.parse(
          b.receivedAt || 0
        ) -
        Date.parse(
          a.receivedAt || 0
        )
    )

  const active = remote.filter(
    (request) =>
      request.stage !== 'Resolved'
  ).length

  const emergencies =
    remote.filter(
      (request) =>
        request.stage !==
          'Resolved' &&
        triage(request).priority ===
          'Emergency'
    ).length

  const urgent = remote.filter(
    (request) =>
      request.stage !==
        'Resolved' &&
      triage(request).priority ===
        'Urgent review'
  ).length

  const resolved = remote.filter(
    (request) =>
      request.stage === 'Resolved'
  ).length

  return (
    <>
      {/* COMMAND CENTRE HEADER */}

      <section className="responder-hero">
        <div>
          <span className="eyebrow">
            ROADSIDE OPERATIONS
          </span>

          <h2>
            Responder Command Centre
          </h2>

          <p>
            Monitor incoming SatResQ
            requests, assess priority,
            and manage the simulated
            roadside response journey.
          </p>
        </div>

        <div
          className={
            'responder-link ' +
            (backend && !offline
              ? 'online'
              : 'offline')
          }
        >
          <span className="dot" />

          <div>
            <b>
              {backend && !offline
                ? 'Receiver connected'
                : 'Receiver unavailable'}
            </b>

            <small>
              {checked
                ? `Last sync ${date(
                    checked
                  )}`
                : 'Waiting for first sync'}
            </small>
          </div>

          <button
            className="btn secondary"
            onClick={refreshRemote}
            disabled={offline}
          >
            <RefreshCw size={15} />

            Refresh
          </button>
        </div>
      </section>

      {/* COMMAND CENTRE STATS */}

      <section className="responder-stats">
        <Stat
          icon={Activity}
          number={active}
          label="Active cases"
        />

        <Stat
          icon={TriangleAlert}
          number={emergencies}
          label="Emergency"
        />

        <Stat
          icon={Clock}
          number={urgent}
          label="Urgent review"
        />

        <Stat
          icon={CheckCircle2}
          number={resolved}
          label="Resolved"
        />
      </section>

      {/* HONEST PROTOTYPE NOTICE */}

      <section className="responder-note">
        <Radio size={18} />

        <span>
          <b>
            Demo operator workspace.
          </b>{' '}
          Actions below simulate a
          roadside assistance provider.
          No real mechanic, emergency
          service, or dispatch network
          is connected.
        </span>
      </section>

      {/* REQUESTS */}

      <section className="command-grid">
        {visibleRequests.map(
          (request, index) => {
            const assessment =
              triage(request)

            const stageIndex =
              stages.indexOf(
                request.stage
              )

            const nextStage =
              stages[
                stageIndex + 1
              ]

            let packetSize = '—'

            try {
              packetSize =
                bytes(
                  request.packet
                ) + ' bytes'
            } catch {
              packetSize =
                'Packet available'
            }

            const safety =
              request.danger === 'yes'
                ? 'Immediate danger'
                : request.exposed ===
                    'yes'
                  ? 'Traffic exposure'
                  : request.danger ===
                        'unknown' ||
                      request.exposed ===
                        'unknown'
                    ? 'Safety uncertain'
                    : 'No immediate danger'

            const hasPhoto =
              !!request.media?.photo

            const hasVoice =
              !!request.media?.voice

            const hasMedia =
              hasPhoto ||
              hasVoice

            const media =
              mediaById[
                request.id
              ]

            const evidenceOpen =
              !!mediaOpen[
                request.id
              ]

            return (
              <article
                key={request.id}
                className={
                  'card command-card ' +
                  (index === 0
                    ? 'newest'
                    : '')
                }
              >
                {/* CASE HEADER */}

                <div className="command-card-head">
                  <div>
                    <span className="mono">
                      CASE{' '}
                      {short(
                        request.id
                      )}
                    </span>

                    {index === 0 && (
                      <span className="new-request-tag">
                        NEWEST
                      </span>
                    )}
                  </div>

                  <Priority
                    report={request}
                  />
                </div>

                {/* REQUEST TITLE */}

                <div className="command-title-row">
                  <div>
                    <span className="eyebrow">
                      INCOMING SATRESQ
                      REQUEST
                    </span>

                    <h3>
                      {request.issue}
                    </h3>

                    <p>
                      {request.vehicle}
                      {' · '}
                      {assessment.help}
                    </p>
                  </div>

                  <div className="request-age">
                    <Clock size={15} />

                    <span>
                      {requestAge(
                        request.receivedAt
                      )}
                    </span>
                  </div>
                </div>

                {/* REQUEST FACTS */}

                <div className="command-facts">
                  <div>
                    <MapPin size={18} />

                    <span>
                      <small>
                        LOCATION
                      </small>

                      <b>
                        {request.location
                          ? `${request.location.latitude.toFixed(
                              5
                            )}, ${request.location.longitude.toFixed(
                              5
                            )}`
                          : request.landmark ||
                            'Not provided'}
                      </b>

                      <em>
                        {request.location
                          ? `Accuracy ±${Math.round(
                              request
                                .location
                                .accuracy
                            )} m`
                          : 'Manual landmark'}
                      </em>
                    </span>
                  </div>

                  <div>
                    <Signal size={18} />

                    <span>
                      <small>
                        ASSISTANCE
                      </small>

                      <b>
                        {
                          assessment.help
                        }
                      </b>

                      <em>
                        {
                          assessment.priority
                        }
                      </em>
                    </span>
                  </div>

                  <div>
                    <FileText size={18} />

                    <span>
                      <small>
                        PACKET
                      </small>

                      <b>
                        {packetSize}
                      </b>

                      <em>
                        Compact request
                      </em>
                    </span>
                  </div>

                  <div>
                    <ShieldCheck
                      size={18}
                    />

                    <span>
                      <small>
                        SAFETY
                      </small>

                      <b>{safety}</b>

                      <em>
                        Traveller-reported
                        status
                      </em>
                    </span>
                  </div>
                </div>

                {/* TRAVELLER NOTE */}

                {request.notes && (
                  <div className="command-notes">
                    <span className="eyebrow">
                      TRAVELLER NOTE
                    </span>

                    <p>
                      {request.notes}
                    </p>
                  </div>
                )}

                {/* PHOTO + VOICE EVIDENCE */}

                <section className="command-evidence">
                  <div className="command-evidence-head">
                    <div>
                      <span className="command-evidence-icon">
                        <Paperclip size={17} />
                      </span>

                      <span>
                        <small>
                          BREAKDOWN EVIDENCE
                        </small>

                        <b>
                          {hasMedia
                            ? 'Traveller added rich media'
                            : 'No media attached'}
                        </b>
                      </span>
                    </div>

                    <div className="command-evidence-badges">
                      <span
                        className={
                          hasPhoto
                            ? 'available'
                            : ''
                        }
                      >
                        <Camera size={14} />
                        Photo
                      </span>

                      <span
                        className={
                          hasVoice
                            ? 'available'
                            : ''
                        }
                      >
                        <Mic size={14} />
                        Voice
                      </span>
                    </div>
                  </div>

                  {hasMedia && (
                    <button
                      type="button"
                      className="btn secondary command-evidence-button"
                      disabled={
                        mediaBusy ===
                        request.id
                      }
                      onClick={() =>
                        toggleEvidence(
                          request
                        )
                      }
                    >
                      {mediaBusy ===
                      request.id ? (
                        <>
                          <LoaderCircle
                            size={16}
                          />
                          Loading evidence…
                        </>
                      ) : evidenceOpen ? (
                        'Hide evidence'
                      ) : (
                        'View photo / voice'
                      )}
                    </button>
                  )}

                  {evidenceOpen && (
                    <div className="command-evidence-body">
                      {mediaErrors[
                        request.id
                      ] && (
                        <p className="command-evidence-error">
                          {
                            mediaErrors[
                              request.id
                            ]
                          }
                        </p>
                      )}

                      {!media &&
                        mediaBusy !==
                          request.id &&
                        !mediaErrors[
                          request.id
                        ] && (
                          <p className="muted small">
                            Evidence is being prepared.
                          </p>
                        )}

                      {media?.photo && (
                        <div className="command-photo-evidence">
                          <div className="command-media-label">
                            <Camera size={15} />

                            <span>
                              <small>
                                PHOTO
                              </small>

                              <b>
                                {media.photo.name ||
                                  'Breakdown photo'}
                              </b>
                            </span>
                          </div>

                          <img
                            src={
                              media.photo
                                .dataUrl
                            }
                            alt="Traveller-provided breakdown evidence"
                          />

                          <small className="muted">
                            Traveller-provided image · for responder context, not automated diagnosis.
                          </small>
                        </div>
                      )}

                      {media?.voice && (
                        <div className="command-voice-evidence">
                          <div className="command-media-label">
                            <Mic size={15} />

                            <span>
                              <small>
                                VOICE NOTE
                              </small>

                              <b>
                                Traveller description
                              </b>
                            </span>
                          </div>

                          <audio
                            controls
                            preload="metadata"
                            src={
                              media.voice
                                .dataUrl
                            }
                          />

                          <small className="muted">
                            Recorded by the traveller and uploaded separately from the compact emergency packet.
                          </small>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* PROGRESS */}

                <div className="command-progress">
                  <div className="section-title">
                    <span className="eyebrow">
                      RESPONSE PROGRESS
                    </span>

                    <b>
                      {request.stage}
                    </b>
                  </div>

                  <div className="command-stage-track">
                    {stages.map(
                      (
                        stage,
                        i
                      ) => (
                        <div
                          key={
                            stage
                          }
                          className={
                            i <=
                            stageIndex
                              ? 'complete'
                              : ''
                          }
                        >
                          <span>
                            {i <=
                            stageIndex ? (
                              <CheckCircle2
                                size={
                                  14
                                }
                              />
                            ) : (
                              i +
                              1
                            )}
                          </span>

                          <small>
                            {
                              stage
                            }
                          </small>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* PACKET + ACTION */}

                <div className="command-actions">
                  <div className="command-meta">
                    <small>
                      Received{' '}
                      {date(
                        request.receivedAt
                      )}
                    </small>

                    <details>
                      <summary>
                        View incoming
                        packet
                      </summary>

                      <pre>
                        {JSON.stringify(
                          request.packet,
                          null,
                          2
                        )}
                      </pre>
                    </details>
                  </div>

                  {request.stage !==
                  'Resolved' ? (
                    <button
                      className="btn primary command-action-button"
                      disabled={
                        !!busy ||
                        offline ||
                        !backend
                      }
                      onClick={() =>
                        advance(
                          request
                        )
                      }
                    >
                      {busy ===
                      request.id
                        ? 'Updating…'
                        : `Mark ${nextStage}`}

                      <ArrowRight
                        size={16}
                      />
                    </button>
                  ) : (
                    <span className="resolved-badge">
                      <CheckCircle2
                        size={17}
                      />

                      Case resolved
                    </span>
                  )}
                </div>
              </article>
            )
          }
        )}
      </section>

      {visibleRequests.length ===
        0 && (
        <div className="card empty">
          <Radio size={32} />

          <h3>
            No matching received
            requests
          </h3>

          <p>
            Send a request from the
            traveller side to see it
            here.
          </p>
        </div>
      )}
    </>
  )
}
