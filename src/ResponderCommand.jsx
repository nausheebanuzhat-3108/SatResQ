import {
  Activity,
  ArrowRight,
  Car,
  CheckCircle2,
  Clock,
  FileText,
  Fuel,
  MapPin,
  Radio,
  RefreshCw,
  ShieldCheck,
  Signal,
  TriangleAlert,
} from 'lucide-react'

import {
  bytes,
  stages,
  triage,
} from '../shared/core'

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

            const vehicleProfile =
              request.vehicleProfile &&
              typeof request.vehicleProfile ===
                'object'
                ? request.vehicleProfile
                : null

            const vehicleName =
              vehicleProfile
                ? [
                    vehicleProfile.make,
                    vehicleProfile.model,
                  ]
                    .filter(Boolean)
                    .join(' ') ||
                  request.vehicle
                : request.vehicle

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
                      {vehicleName}
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

                {vehicleProfile && (
                  <section className="command-vehicle-profile">
                    <div className="command-vehicle-profile-head">
                      <div>
                        <span className="command-vehicle-profile-icon">
                          <Car size={19} />
                        </span>

                        <span>
                          <small>
                            VEHICLE PROFILE RECEIVED
                          </small>

                          <b>
                            {vehicleName}
                          </b>
                        </span>
                      </div>

                      <span className="command-packet-version">
                        PACKET V
                        {request.packet?.v || 2}
                      </span>
                    </div>

                    <div className="command-vehicle-profile-grid">
                      <div>
                        <Car size={16} />

                        <span>
                          <small>
                            VEHICLE TYPE
                          </small>

                          <b>
                            {request.vehicle}
                          </b>
                        </span>
                      </div>

                      <div>
                        <FileText size={16} />

                        <span>
                          <small>
                            REGISTRATION
                          </small>

                          <b>
                            {vehicleProfile.registration ||
                              'Not provided'}
                          </b>
                        </span>
                      </div>

                      <div>
                        <Fuel size={16} />

                        <span>
                          <small>
                            FUEL / POWER
                          </small>

                          <b>
                            {vehicleProfile.fuelType ||
                              'Not provided'}
                          </b>
                        </span>
                      </div>

                      <div>
                        <ShieldCheck size={16} />

                        <span>
                          <small>
                            PROFILE STATUS
                          </small>

                          <b>
                            Included in request
                          </b>
                        </span>
                      </div>
                    </div>
                  </section>
                )}

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