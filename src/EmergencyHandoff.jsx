import {
  Check,
  Copy,
  FileText,
  MapPin,
  Radio,
  Satellite,
  Send,
  Share2,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  bytes,
  encode,
  triage,
} from '../shared/core'


function makeEmergencyText(report) {
  const assessment =
    triage(report)

  const location =
    report.location
      ? `${report.location.latitude.toFixed(
          5
        )}, ${report.location.longitude.toFixed(
          5
        )}`
      : report.landmark ||
        'Location not available'

  return [
    'SATRESQ ROADSIDE REQUEST',
    `Case: ${report.id
      .slice(0, 8)
      .toUpperCase()}`,
    `Vehicle: ${report.vehicle}`,
    `Problem: ${report.issue}`,
    `Priority: ${assessment.priority}`,
    `Assistance: ${assessment.help}`,
    `Location: ${location}`,
    `Immediate danger: ${
      report.danger === 'unknown'
        ? 'Not sure'
        : report.danger
    }`,
    `Traffic exposure: ${
      report.exposed === 'unknown'
        ? 'Not sure'
        : report.exposed
    }`,
    report.notes
      ? `Notes: ${report.notes}`
      : null,
  ]
    .filter(Boolean)
    .join('\n')
}


export default function EmergencyHandoff({
  report,
}) {
  const [
    online,
    setOnline,
  ] = useState(
    () =>
      typeof navigator !==
        'undefined'
        ? navigator.onLine
        : false
  )

  const [
    copied,
    setCopied,
  ] = useState(false)

  const [
    shareMessage,
    setShareMessage,
  ] = useState('')


  useEffect(() => {
    const goOnline = () =>
      setOnline(true)

    const goOffline = () =>
      setOnline(false)

    window.addEventListener(
      'online',
      goOnline
    )

    window.addEventListener(
      'offline',
      goOffline
    )

    return () => {
      window.removeEventListener(
        'online',
        goOnline
      )

      window.removeEventListener(
        'offline',
        goOffline
      )
    }
  }, [])


  const emergencyText =
    useMemo(
      () =>
        makeEmergencyText(
          report
        ),
      [report]
    )


  let packetSize = '—'

  try {
    packetSize =
      `${bytes(
        encode(report)
      )} B`
  } catch {
    packetSize =
      'Not ready'
  }


  async function copySummary() {
    try {
      await navigator.clipboard.writeText(
        emergencyText
      )

      setCopied(true)

      setShareMessage(
        'Emergency summary copied.'
      )

      setTimeout(
        () => {
          setCopied(false)
          setShareMessage('')
        },
        2500
      )
    } catch {
      setShareMessage(
        'Copying was blocked by the browser.'
      )
    }
  }


  async function shareSummary() {
    if (!navigator.share) {
      await copySummary()

      setShareMessage(
        'Native sharing is unavailable here, so the summary was copied instead.'
      )

      return
    }

    try {
      await navigator.share({
        title:
          'SatResQ Roadside Request',

        text:
          emergencyText,
      })

      setShareMessage(
        'Emergency summary opened in the device share sheet.'
      )
    } catch (error) {
      if (
        error?.name !==
        'AbortError'
      ) {
        setShareMessage(
          'The share action could not be completed.'
        )
      }
    }
  }


  return (
    <section className="emergency-handoff">

      <div className="handoff-head">

        <div className="handoff-title">

          <span className="handoff-icon">
            <Radio
              size={22}
            />
          </span>

          <div>
            <small>
              EMERGENCY HANDOFF
            </small>

            <h3>
              Critical information, ready to move.
            </h3>

            <p>
              SatResQ prepares a compact request first, then provides alternative ways to carry the essential information when normal connectivity is limited.
            </p>
          </div>

        </div>

        <span
          className={
            'handoff-network ' +
            (online
              ? 'online'
              : 'offline')
          }
        >
          {online ? (
            <Wifi size={15} />
          ) : (
            <WifiOff
              size={15}
            />
          )}

          {online
            ? 'NETWORK AVAILABLE'
            : 'OFFLINE'}
        </span>

      </div>


      <div className="handoff-priority">

        <div>
          <ShieldCheck
            size={18}
          />

          <span>
            <small>
              CRITICAL PACKET
            </small>

            <b>
              {packetSize}
            </b>
          </span>
        </div>

        <p>
          Vehicle, issue, safety state, location and assistance information are prepared before transmission.
        </p>

      </div>


      <div className="handoff-routes">

        <div
          className={
            'handoff-route ' +
            (online
              ? 'available'
              : 'waiting')
          }
        >

          <span>
            {online ? (
              <Check
                size={17}
              />
            ) : (
              <WifiOff
                size={17}
              />
            )}
          </span>

          <div>
            <small>
              PRIMARY
            </small>

            <b>
              Internet / HTTP
            </b>

            <p>
              {online
                ? 'Conventional network detected. SatResQ can attempt normal server delivery.'
                : 'Unavailable right now. An authorised request can remain queued locally.'}
            </p>
          </div>

        </div>


        <div className="handoff-route available">

          <span>
            <FileText
              size={17}
            />
          </span>

          <div>
            <small>
              OFFLINE FALLBACK
            </small>

            <b>
              Compact emergency summary
            </b>

            <p>
              A human-readable version of the essential request can be copied even when SatResQ cannot reach its server.
            </p>
          </div>

        </div>


        <div className="handoff-route available">

          <span>
            <Share2
              size={17}
            />
          </span>

          <div>
            <small>
              DEVICE CHANNEL
            </small>

            <b>
              Native share handoff
            </b>

            <p>
              When supported, SatResQ can pass the prepared summary to the device share sheet for another available communication app.
            </p>
          </div>

        </div>


        <div className="handoff-route simulated">

          <span>
            <Satellite
              size={17}
            />
          </span>

          <div>
            <small>
              SATELLITE-READY
            </small>

            <b>
              Alternative transport
            </b>

            <p>
              Satellite delivery remains simulated in this prototype and requires compatible hardware or a satellite service for real deployment.
            </p>
          </div>

        </div>

      </div>


      <div className="handoff-summary">

        <div className="handoff-summary-top">

          <span>
            <MapPin
              size={16}
            />

            LOW-DATA EMERGENCY SUMMARY
          </span>

          <span>
            Case{' '}
            {report.id
              .slice(0, 8)
              .toUpperCase()}
          </span>

        </div>

        <pre>
          {emergencyText}
        </pre>

      </div>


      <div className="handoff-actions">

        <button
          type="button"
          className="btn secondary"
          onClick={
            copySummary
          }
        >
          {copied ? (
            <Check
              size={16}
            />
          ) : (
            <Copy
              size={16}
            />
          )}

          {copied
            ? 'Copied'
            : 'Copy summary'}
        </button>


        <button
          type="button"
          className="btn primary"
          onClick={
            shareSummary
          }
        >
          <Share2
            size={16}
          />

          Share emergency summary
        </button>

      </div>


      {shareMessage && (
        <p
          className="handoff-message"
          role="status"
        >
          {shareMessage}
        </p>
      )}


      <div className="handoff-principle">

        <Send
          size={18}
        />

        <span>
          <b>
            Critical first.
          </b>{' '}
          SatResQ prioritises the small emergency request so essential roadside information is available before richer, less urgent data.
        </span>

      </div>

    </section>
  )
}