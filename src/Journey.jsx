import { useEffect, useRef, useState } from 'react'

import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Navigation,
  X,
  Zap,
  WifiOff,
  Wifi,
  Send,
  Car,
  CircleDot,
  BatteryCharging,
  Fuel,
  Thermometer,
  HelpCircle,
  ChevronRight,
  FileText,
  Clock,
  AlertTriangle,
  PackageCheck,
  Radio,
  Satellite,
  Camera,
  ImagePlus,
  Trash2,
  Mic,
  Square,
  Volume2,
} from 'lucide-react'

import {
  vehicles,
  issues,
  triage,
  validate,
  stages,
  safetyGuidance,
  encode,
  bytes,
} from '../shared/core'

import { readVehicleProfile } from './VehicleProfile'
import OfflineAssistant from './OfflineAssistant'
import EmergencyHandoff from './EmergencyHandoff'

const DRAFT = 'satresq-guided-draft-v1'
const PHOTO_PREFIX = 'satresq-breakdown-photo-v1:'
const VOICE_PREFIX = 'satresq-breakdown-voice-v1:'

const photoKey = (id) => `${PHOTO_PREFIX}${id}`
const voiceKey = (id) => `${VOICE_PREFIX}${id}`

function readPhoto(id) {
  try {
    const photo = JSON.parse(
      localStorage.getItem(photoKey(id)) || 'null'
    )

    if (
      !photo ||
      typeof photo !== 'object' ||
      typeof photo.dataUrl !== 'string' ||
      !photo.dataUrl.startsWith('data:image/')
    ) {
      return null
    }

    return {
      dataUrl: photo.dataUrl,
      name:
        typeof photo.name === 'string'
          ? photo.name.slice(0, 120)
          : 'Breakdown photo',
      type:
        typeof photo.type === 'string'
          ? photo.type
          : 'image/jpeg',
      size:
        Number.isFinite(photo.size)
          ? photo.size
          : 0,
      capturedAt:
        typeof photo.capturedAt === 'string'
          ? photo.capturedAt
          : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

function savePhoto(id, photo) {
  localStorage.setItem(
    photoKey(id),
    JSON.stringify(photo)
  )
}

function deletePhoto(id) {
  localStorage.removeItem(photoKey(id))
}

function readVoice(id) {
  try {
    const voice = JSON.parse(
      localStorage.getItem(voiceKey(id)) || 'null'
    )

    if (
      !voice ||
      typeof voice !== 'object' ||
      typeof voice.dataUrl !== 'string' ||
      !voice.dataUrl.startsWith('data:audio/')
    ) {
      return null
    }

    return {
      dataUrl: voice.dataUrl,
      type:
        typeof voice.type === 'string'
          ? voice.type
          : 'audio/webm',
      size:
        Number.isFinite(voice.size)
          ? voice.size
          : 0,
      duration:
        Number.isFinite(voice.duration)
          ? voice.duration
          : 0,
      capturedAt:
        typeof voice.capturedAt === 'string'
          ? voice.capturedAt
          : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

function saveVoice(id, voice) {
  localStorage.setItem(
    voiceKey(id),
    JSON.stringify(voice)
  )
}

function deleteVoice(id) {
  localStorage.removeItem(voiceKey(id))
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () =>
      reject(new Error('The recording could not be saved.'))

    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

function prettyDuration(seconds) {
  const safe = Math.max(0, Math.round(seconds || 0))
  return `${safe}s`
}

function prettySize(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 'compressed image'
  }

  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function compressPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('Choose an image file.'))
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      reject(
        new Error(
          'Choose an image smaller than 10 MB.'
        )
      )
      return
    }

    const reader = new FileReader()

    reader.onerror = () =>
      reject(
        new Error(
          'The image could not be read.'
        )
      )

    reader.onload = () => {
      const image = new Image()

      image.onerror = () =>
        reject(
          new Error(
            'The selected image could not be opened.'
          )
        )

      image.onload = () => {
        const maxSide = 1024
        const scale = Math.min(
          1,
          maxSide /
            Math.max(
              image.naturalWidth,
              image.naturalHeight
            )
        )

        const width = Math.max(
          1,
          Math.round(
            image.naturalWidth * scale
          )
        )

        const height = Math.max(
          1,
          Math.round(
            image.naturalHeight * scale
          )
        )

        const canvas =
          document.createElement('canvas')

        canvas.width = width
        canvas.height = height

        const context =
          canvas.getContext('2d')

        if (!context) {
          reject(
            new Error(
              'Image processing is unavailable in this browser.'
            )
          )
          return
        }

        context.drawImage(
          image,
          0,
          0,
          width,
          height
        )

        const dataUrl =
          canvas.toDataURL(
            'image/jpeg',
            0.72
          )

        /*
         * Keep the local attachment reasonably small.
         * The critical emergency packet remains text-only.
         */
        if (dataUrl.length > 1_800_000) {
          reject(
            new Error(
              'The compressed image is still too large. Try another photo.'
            )
          )
          return
        }

        const approxBytes =
          Math.round(
            (dataUrl.length * 3) / 4
          )

        resolve({
          dataUrl,
          name:
            file.name ||
            'breakdown-photo.jpg',
          type: 'image/jpeg',
          size: approxBytes,
          capturedAt:
            new Date().toISOString(),
        })
      }

      image.src = reader.result
    }

    reader.readAsDataURL(file)
  })
}

const titles = [
  'The problem',
  'Your safety',
  'Your location',
  'Review & send',
]

const icons = [
  CircleDot,
  BatteryCharging,
  Fuel,
  Thermometer,
  HelpCircle,
]

const descriptions = [
  'Flat, punctured or damaged',
  'Battery or starting trouble',
  'The tank is empty',
  'Temperature warning or steam',
  'Describe what you noticed',
]

function readDraft() {
  try {
    const d = JSON.parse(
      localStorage.getItem(DRAFT) || 'null'
    )

    if (!d) return null

    return {
      id:
        typeof d.id === 'string'
          ? d.id
          : crypto.randomUUID(),

      createdAt:
        typeof d.createdAt === 'string'
          ? d.createdAt
          : new Date().toISOString(),

      vehicle: vehicles.includes(d.vehicle)
        ? d.vehicle
        : 'Car',

      issue: issues.includes(d.issue)
        ? d.issue
        : '',

      danger: ['yes', 'no', 'unknown'].includes(
        d.danger
      )
        ? d.danger
        : '',

      exposed: ['yes', 'no', 'unknown'].includes(
        d.exposed
      )
        ? d.exposed
        : '',

      landmark:
        typeof d.landmark === 'string'
          ? d.landmark.slice(0, 300)
          : '',

      notes:
        typeof d.notes === 'string'
          ? d.notes.slice(0, 500)
          : '',

      vehicleProfile:
        d.vehicleProfile &&
        typeof d.vehicleProfile === 'object'
          ? {
              make:
                typeof d.vehicleProfile.make === 'string'
                  ? d.vehicleProfile.make.slice(0, 40)
                  : '',

              model:
                typeof d.vehicleProfile.model === 'string'
                  ? d.vehicleProfile.model.slice(0, 40)
                  : '',

              registration:
                typeof d.vehicleProfile.registration === 'string'
                  ? d.vehicleProfile.registration.slice(0, 20)
                  : '',

              fuelType:
                typeof d.vehicleProfile.fuelType === 'string'
                  ? d.vehicleProfile.fuelType
                  : 'Petrol',
            }
          : null,

      location:
        d.location &&
        Number.isFinite(d.location.latitude) &&
        Number.isFinite(d.location.longitude) &&
        Number.isFinite(d.location.accuracy) &&
        Number.isFinite(
          Date.parse(d.location.capturedAt)
        )
          ? d.location
          : null,
    }
  } catch {
    return null
  }
}

const blank = () => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  vehicle: 'Car',
  issue: '',
  danger: '',
  exposed: '',
  landmark: '',
  notes: '',
  vehicleProfile: null,
  location: null,
})

function RoadScene() {
  return (
    <svg
      className="road-scene"
      viewBox="0 0 680 660"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="land"
          x2="1"
          y2="1"
        >
          <stop stopColor="#234c46" />

          <stop
            offset="1"
            stopColor="#102e30"
          />
        </linearGradient>

        <linearGradient
          id="route"
          x2="1"
          y2="0"
        >
          <stop stopColor="#405c51" />

          <stop
            offset="1"
            stopColor="#71826a"
          />
        </linearGradient>
      </defs>

      <rect
        width="680"
        height="660"
        fill="url(#land)"
      />

      <g
        fill="none"
        stroke="#a8c39a"
        opacity=".12"
      >
        <path d="M-50 380Q250 20 750 100M-50 420Q250 60 750 140M-50 460Q250 100 750 180M-50 500Q250 140 750 220M-50 540Q250 180 750 260M-50 580Q250 220 750 300" />

        <circle
          cx="480"
          cy="370"
          r="165"
        />

        <circle
          cx="480"
          cy="370"
          r="230"
        />
      </g>

      <path
        d="M430 740C80 490 660 410 420 200S370 20 400-100"
        fill="none"
        stroke="#102b2c"
        strokeWidth="116"
      />

      <path
        d="M430 740C80 490 660 410 420 200S370 20 400-100"
        fill="none"
        stroke="url(#route)"
        strokeWidth="94"
      />

      <path
        d="M430 740C80 490 660 410 420 200S370 20 400-100"
        fill="none"
        stroke="#e0e7bd"
        strokeWidth="2"
        strokeDasharray="13 15"
        opacity=".65"
      />

      <g transform="translate(425 348) rotate(23)">
        <rect
          x="-19"
          y="-32"
          width="38"
          height="66"
          rx="12"
          fill="#d8f58e"
        />

        <rect
          x="-14"
          y="-16"
          width="28"
          height="27"
          rx="5"
          fill="#254443"
        />

        <path
          d="M-12-23H12M-12 24H12"
          stroke="#fff"
          strokeWidth="3"
          opacity=".7"
        />
      </g>

      <g transform="translate(420 240)">
        <circle
          r="52"
          fill="#d8f58e"
          opacity=".08"
        />

        <circle
          r="38"
          fill="#d8f58e"
          opacity=".13"
        />

        <circle
          r="25"
          fill="#d8f58e"
        />

        <path
          d="M0 12S12 1 12-6a12 12 0 0 0-24 0C-12 1 0 12 0 12Z"
          fill="none"
          stroke="#1c4641"
          strokeWidth="2.5"
        />

        <circle
          cy="-6"
          r="4"
          fill="#1c4641"
        />
      </g>

      <g
        fill="#91a984"
        opacity=".5"
      >
        <circle
          cx="170"
          cy="260"
          r="15"
        />

        <circle
          cx="148"
          cy="289"
          r="23"
        />

        <circle
          cx="575"
          cy="472"
          r="27"
        />

        <circle
          cx="596"
          cy="433"
          r="18"
        />

        <circle
          cx="294"
          cy="100"
          r="19"
        />
      </g>
    </svg>
  )
}

/* =========================================================
   HOME / WELCOME
   ========================================================= */

export function Welcome({
  cached,
  connected,
  rows,
  onStart,
  onTrack,
}) {
  const [draft, setDraft] = useState(
    () => !!readDraft()
  )

  useEffect(() => {
    setDraft(!!readDraft())
  })

  return (
    <div className="welcome">
      <div className="welcome-bar">
        <span>
          <span className="dot" />

          ASTRAVEX
          <i> / </i>
          ROADSIDE COMPANION
        </span>

        <span>
          DESIGNED FOR THE UNEXPECTED
        </span>
      </div>

      <section className="journey-hero">
        <div className="journey-hero-copy">
          <span className="hero-chip">
            <ShieldCheck size={14} />

            OFFLINE FIRST. ALWAYS PREPARED.
          </span>

          <h1>
            A turn in the road.
            <br />

            A clear way <em>forward.</em>
          </h1>

          <p>
            When your journey stops, your next
            step shouldn’t be a question.
            Prepare a roadside report, one
            simple step at a time.
          </p>

          <button
            className="btn lime journey-cta"
            onClick={onStart}
          >
            {draft
              ? 'Continue your report'
              : 'Get roadside help'}

            <ArrowRight size={20} />
          </button>

          <span className="hero-disclaimer">
            Demonstration only. No real
            emergency service is connected.
          </span>

          <div className="hero-assurances">
            <span>
              <WifiOff size={16} />

              Works offline after setup
            </span>

            <span>
              <ShieldCheck size={16} />

              You choose when to send
            </span>
          </div>
        </div>

        <div className="hero-landscape">
          <RoadScene />

          <div className="landscape-top">
            <span className="dot" />

            YOUR JOURNEY, KEPT CLOSE
          </div>

          <div className="landscape-card">
            <span className="landscape-icon">
              <MapPin size={23} />
            </span>

            <div>
              <small>
                ONE STEP AT A TIME
              </small>

              <b>
                From roadside to report.
              </b>

              <span>
                A clear path, even without a
                connection.
              </span>
            </div>
          </div>

          <span className="landscape-caption">
            01 / PREPARE. SAVE. CONNECT.
          </span>
        </div>
      </section>

      <div className="journey-status">
        <span>
          <span
            className={
              'status-icon ' +
              (cached ? 'ready' : '')
            }
          >
            <ShieldCheck size={19} />
          </span>

          <span>
            <b>
              {cached
                ? 'Ready for offline reporting'
                : 'Preparing your offline copy'}
            </b>

            <small>
              {cached
                ? 'This browser has the app cached.'
                : 'Load online and allow offline caching to finish.'}
            </small>
          </span>
        </span>

        <span>
          <span className="dot" />

          {connected
            ? 'Demo server connected'
            : 'Reports can be saved locally'}
        </span>

        <button onClick={onTrack}>
          My requests

          <span>{rows.length}</span>

          <ArrowRight size={16} />
        </button>
      </div>

      <section className="journey-how">
        <div>
          <p className="eyebrow">
            A LITTLE CLARITY GOES A LONG WAY
          </p>

          <h2>
            Four steps. One less thing
            <br />
            to worry about.
          </h2>

          <p>
            Your report stays on this device.
            <br />
            Delivery is confirmed by the demo
            server.
          </p>
        </div>

        <div className="journey-steps">
          {[
            [
              CircleDot,
              'Tell us what happened',
              'Choose the issue with your vehicle.',
            ],

            [
              ShieldCheck,
              'Check the situation',
              'Answer two quick safety questions.',
            ],

            [
              MapPin,
              'Add your location',
              'Use coordinates or a nearby landmark.',
            ],

            [
              Send,
              'Review, then send',
              'Stay in control and follow the status.',
            ],
          ].map(([Icon, title, text], i) => (
            <div key={title}>
              <span className="how-icon">
                <Icon size={23} />
              </span>

              <small>0{i + 1}</small>

              <h3>{title}</h3>

              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {rows.length > 0 && (
        <button
          className="resume-strip"
          onClick={onTrack}
        >
          <FileText size={22} />

          <span>
            <b>
              Your saved requests are right
              here.
            </b>

            <small>
              Review delivery receipts and demo
              responder progress.
            </small>
          </span>

          <ArrowRight size={22} />
        </button>
      )}
    </div>
  )
}

/* =========================================================
   SMART SAFETY GUIDANCE
   ========================================================= */

export function SafetyGuidanceCard({
  report,
  compact = false,
}) {
  const guide = safetyGuidance(report)

  return (
    <section
      className={
        'safety-guidance ' +
        guide.level +
        (compact ? ' compact' : '')
      }
    >
      <div className="safety-guidance-head">
        <span>
          <AlertTriangle size={18} />
        </span>

        <div>
          <small>
            SMART SAFETY GUIDANCE
          </small>

          <h3>{guide.title}</h3>
        </div>
      </div>

      <ol>
        {guide.steps.map((step, i) => (
          <li key={step}>
            <span>{i + 1}</span>

            <p>{step}</p>
          </li>
        ))}
      </ol>

      <p className="safety-disclaimer">
        Guidance is precautionary and does not
        replace emergency services or a
        qualified mechanic.
      </p>
    </section>
  )
}

/* =========================================================
   CONNECTIVITY RESILIENCE
   ========================================================= */

export function ConnectivityPanel({
  report,
}) {
  const [online, setOnline] = useState(
    () =>
      typeof navigator !== 'undefined'
        ? navigator.onLine
        : false
  )

  useEffect(() => {
    const becameOnline = () =>
      setOnline(true)

    const becameOffline = () =>
      setOnline(false)

    window.addEventListener(
      'online',
      becameOnline
    )

    window.addEventListener(
      'offline',
      becameOffline
    )

    return () => {
      window.removeEventListener(
        'online',
        becameOnline
      )

      window.removeEventListener(
        'offline',
        becameOffline
      )
    }
  }, [])

  let packetReady = false
  let packetSize = null

  try {
    const packet = encode(report)

    packetReady = true
    packetSize = bytes(packet)
  } catch {
    packetReady = false
  }

  const gpsReady = !!report.location

  return (
    <section className="connectivity-panel">
      <div className="connectivity-header">
        <div>
          <small>
            CONNECTION RESILIENCE
          </small>

          <h3>
            Ready even when the network isn't.
          </h3>
        </div>

        <span className="connectivity-badge">
          <Satellite size={17} />

          FALLBACK READY
        </span>
      </div>

      <div className="connectivity-grid">
        <div className="connectivity-item success">
          <span>
            <Check size={15} />
          </span>

          <div>
            <b>
              Offline application
            </b>

            <small>
              Emergency reporting remains
              available after the app is
              cached.
            </small>
          </div>
        </div>

        <div
          className={
            'connectivity-item ' +
            (gpsReady
              ? 'success'
              : 'warning')
          }
        >
          <span>
            {gpsReady ? (
              <Check size={15} />
            ) : (
              <MapPin size={15} />
            )}
          </span>

          <div>
            <b>
              Location information
            </b>

            <small>
              {gpsReady
                ? 'GPS coordinates captured and ready for transmission.'
                : report.landmark
                  ? 'Landmark available when GPS coordinates cannot be captured.'
                  : 'Location information is still required.'}
            </small>
          </div>
        </div>

        <div
          className={
            'connectivity-item ' +
            (online
              ? 'success'
              : 'offline')
          }
        >
          <span>
            {online ? (
              <Wifi size={15} />
            ) : (
              <WifiOff size={15} />
            )}
          </span>

          <div>
            <b>
              Conventional network
            </b>

            <small>
              {online
                ? 'Network detected — conventional transmission can be attempted.'
                : 'No conventional network detected — fallback communication is required.'}
            </small>
          </div>
        </div>

        <div
          className={
            'connectivity-item ' +
            (packetReady
              ? 'success'
              : 'warning')
          }
        >
          <span>
            {packetReady ? (
              <Check size={15} />
            ) : (
              <PackageCheck size={15} />
            )}
          </span>

          <div>
            <b>
              Emergency packet
            </b>

            <small>
              {packetReady
                ? `Compact low-data packet prepared · ${packetSize} bytes.`
                : 'Complete the required information to prepare the emergency packet.'}
            </small>
          </div>
        </div>
      </div>

      <div className="fallback-route">
        <div>
          <span className="fallback-icon">
            <Satellite size={22} />
          </span>

          <span>
            <small>
              ALTERNATIVE COMMUNICATION
            </small>

            <b>
              Satellite-ready fallback channel
            </b>
          </span>
        </div>

        <small>
          Satellite communication is simulated
          in this prototype. Real transmission
          requires compatible satellite
          hardware or services.
        </small>
      </div>
    </section>
  )
}

/* =========================================================
   RESCUE SUMMARY
   ========================================================= */

export function RescueSummaryCard({
  report,
  state,
  stage,
}) {
  const result = triage(report)

  let packet = '—'

  try {
    packet =
      bytes(encode(report)) + ' B'
  } catch {
    packet = 'Pending'
  }

  const location = report.location
    ? `${report.location.latitude.toFixed(
        4
      )}, ${report.location.longitude.toFixed(
        4
      )}`
    : report.landmark || 'Pending'

  const delivery = stage
    ? stage
    : state === 'received'
      ? 'Received'
      : state === 'pending'
        ? 'Queued'
        : state === 'blocked'
          ? 'Needs attention'
          : 'Prepared'

  return (
    <section className="rescue-summary">
      <div className="rescue-summary-top">
        <div>
          <small>
            RESCUE SUMMARY
          </small>

          <h3>
            Case{' '}
            {report.id
              .slice(0, 8)
              .toUpperCase()}
          </h3>
        </div>

        <span
          className={
            'rescue-priority rp-' +
            result.rank
          }
        >
          {result.priority}
        </span>
      </div>

      <div className="rescue-summary-grid">
        <div>
          <ShieldCheck size={17} />

          <span>
            <small>
              Assistance
            </small>

            <b>{result.help}</b>
          </span>
        </div>

        <div>
          <MapPin size={17} />

          <span>
            <small>
              Location
            </small>

            <b>{location}</b>
          </span>
        </div>

        <div>
          <PackageCheck size={17} />

          <span>
            <small>
              Compact packet
            </small>

            <b>{packet}</b>
          </span>
        </div>

        <div>
          <Radio size={17} />

          <span>
            <small>
              Status
            </small>

            <b>{delivery}</b>
          </span>
        </div>
      </div>
    </section>
  )
}

/* =========================================================
   REQUEST PROGRESS
   ========================================================= */

export function RequestProgress({
  item,
}) {
  const confirmed =
    item.state === 'received'

  const index = confirmed
    ? Math.max(
        0,
        stages.indexOf(
          item.server?.stage
        )
      )
    : -1

  const steps = [
    'Saved',
    'Received',
    'Accepted',
    'En route',
    'Resolved',
  ]

  return (
    <section
      className="request-progress"
      aria-label="Request progress"
    >
      <p className="eyebrow">
        YOUR REQUEST JOURNEY
      </p>

      <ol>
        {steps.map((step, i) => {
          const done =
            i === 0 ||
            (confirmed &&
              i <= index + 1)

          return (
            <li
              key={step}
              className={
                done
                  ? 'complete'
                  : ''
              }
              aria-current={
                i ===
                (confirmed
                  ? index + 1
                  : 0)
                  ? 'step'
                  : undefined
              }
            >
              <span>
                {done ? (
                  <Check size={13} />
                ) : (
                  i + 1
                )}
              </span>

              <b>{step}</b>
            </li>
          )
        })}
      </ol>

      {item.state === 'pending' && (
        <p role="status">
          <Clock size={14} />

          Queued · waiting for a confirmed
          receipt
        </p>
      )}

      {item.state === 'blocked' && (
        <p>
          Delivery needs attention. Review the
          message below.
        </p>
      )}

      <small>
        Responder steps are demo operator
        updates, not real dispatch.
      </small>
    </section>
  )
}

/* =========================================================
   GUIDED REPORTING JOURNEY
   ========================================================= */

export function ReportJourney({
  onClose,
  onSave,
}) {
  const [vehicleProfile] = useState(
    () => readVehicleProfile()
  )

  const [report, setReport] = useState(() => {
    const draft = readDraft()

    if (draft) return draft

    const fresh = blank()
    const profile = readVehicleProfile()

    if (
      profile &&
      vehicles.includes(profile.vehicleType)
    ) {
      fresh.vehicle = profile.vehicleType
      fresh.vehicleProfile = {
        make: profile.make || '',
        model: profile.model || '',
        registration: profile.registration || '',
        fuelType: profile.fuelType || 'Petrol',
      }
    }

    return fresh
  })

  const [photo, setPhoto] = useState(
    () => readPhoto(report.id)
  )

  const [photoBusy, setPhotoBusy] =
    useState(false)

  const photoInput = useRef(null)

  const [voice, setVoice] = useState(
    () => readVoice(report.id)
  )

  const [recording, setRecording] =
    useState(false)

  const [voiceBusy, setVoiceBusy] =
    useState(false)

  const [recordSeconds, setRecordSeconds] =
    useState(0)

  const mediaRecorder = useRef(null)
  const mediaStream = useRef(null)
  const audioChunks = useRef([])
  const recordingTimer = useRef(null)
  const recordingStopTimer = useRef(null)
  const recordingStartedAt = useRef(0)

  const [useSavedVehicle, setUseSavedVehicle] =
    useState(() => {
      const draft = readDraft()
      if (draft) return !!draft.vehicleProfile
      return !!readVehicleProfile()
    })

  const [step, setStep] = useState(0)

  const [safety, setSafety] =
    useState(0)

  const [finding, setFinding] =
    useState(false)

  const [error, setError] =
    useState('')

  const [storageError, setStorageError] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  const dialog = useRef(null)
  const title = useRef(null)
  const mounted = useRef(true)
  const first = useRef(true)

  useEffect(() => {
    dialog.current?.showModal()

    const previous =
      document.body.style.overflow

    document.body.style.overflow =
      'hidden'

    return () => {
      mounted.current = false

      clearInterval(recordingTimer.current)
      clearTimeout(recordingStopTimer.current)

      if (
        mediaRecorder.current &&
        mediaRecorder.current.state !== 'inactive'
      ) {
        try {
          mediaRecorder.current.stop()
        } catch {
          // recorder may already be closing
        }
      }

      mediaStream.current
        ?.getTracks()
        .forEach((track) => track.stop())

      document.body.style.overflow =
        previous
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT,
        JSON.stringify(report)
      )

      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }, [report])

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }

    title.current?.focus()

    dialog.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }, [step, safety])

  function change(key, value) {
    setReport((current) => ({
      ...current,
      [key]: value,
    }))

    setError('')
  }

  function chooseSavedVehicle() {
    if (!vehicleProfile) return

    setReport((current) => ({
      ...current,
      vehicle: vehicleProfile.vehicleType,
      vehicleProfile: {
        make: vehicleProfile.make || '',
        model: vehicleProfile.model || '',
        registration: vehicleProfile.registration || '',
        fuelType: vehicleProfile.fuelType || 'Petrol',
      },
    }))

    setUseSavedVehicle(true)
    setError('')
  }

  function chooseVehicle(vehicle) {
    setReport((current) => ({
      ...current,
      vehicle,
      vehicleProfile: null,
    }))

    setUseSavedVehicle(false)
    setError('')
  }

  async function addPhoto(event) {
    const file =
      event.target.files?.[0]

    /*
     * Reset the file input so the same image can
     * be selected again after removing it.
     */
    event.target.value = ''

    if (!file) return

    setPhotoBusy(true)
    setError('')

    try {
      const prepared =
        await compressPhoto(file)

      savePhoto(
        report.id,
        prepared
      )

      setPhoto(prepared)
    } catch (photoError) {
      setError(
        photoError.message ||
          'Could not save the image.'
      )
    } finally {
      setPhotoBusy(false)
    }
  }

  function removePhoto() {
    try {
      deletePhoto(report.id)
      setPhoto(null)
      setError('')
    } catch {
      setError(
        'The image could not be removed from local storage.'
      )
    }
  }

  function stopVoiceRecording() {
    clearTimeout(recordingStopTimer.current)

    if (
      mediaRecorder.current &&
      mediaRecorder.current.state !== 'inactive'
    ) {
      mediaRecorder.current.stop()
    }
  }

  async function startVoiceRecording() {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setError(
        'Voice recording is not supported in this browser.'
      )
      return
    }

    setError('')
    setVoiceBusy(true)
    setRecordSeconds(0)

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        })

      mediaStream.current = stream

      const preferred = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
      ].find((type) =>
        MediaRecorder.isTypeSupported?.(type)
      )

      const options = {
        audioBitsPerSecond: 24000,
        ...(preferred
          ? { mimeType: preferred }
          : {}),
      }

      const recorder =
        new MediaRecorder(stream, options)

      mediaRecorder.current = recorder
      audioChunks.current = []
      recordingStartedAt.current = Date.now()

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          audioChunks.current.push(event.data)
        }
      }

      recorder.onerror = () => {
        setError('Voice recording failed. Please try again.')
      }

      recorder.onstop = async () => {
        clearInterval(recordingTimer.current)
        clearTimeout(recordingStopTimer.current)

        const duration = Math.max(
          1,
          Math.round(
            (Date.now() - recordingStartedAt.current) /
              1000
          )
        )

        const blob = new Blob(
          audioChunks.current,
          {
            type:
              recorder.mimeType ||
              preferred ||
              'audio/webm',
          }
        )

        try {
          if (!blob.size) {
            throw new Error(
              'No audio was captured. Please try again.'
            )
          }

          if (blob.size > 750 * 1024) {
            throw new Error(
              'The recording is too large. Keep the voice note short.'
            )
          }

          const dataUrl =
            await blobToDataUrl(blob)

          const prepared = {
            dataUrl,
            type: blob.type || 'audio/webm',
            size: blob.size,
            duration,
            capturedAt:
              new Date().toISOString(),
          }

          saveVoice(
            report.id,
            prepared
          )

          if (mounted.current) {
            setVoice(prepared)
            setError('')
          }
        } catch (voiceError) {
          if (mounted.current) {
            setError(
              voiceError.message ||
                'Could not save the voice note.'
            )
          }
        } finally {
          stream
            .getTracks()
            .forEach((track) => track.stop())

          mediaStream.current = null
          mediaRecorder.current = null
          audioChunks.current = []

          if (mounted.current) {
            setRecording(false)
            setVoiceBusy(false)
          }
        }
      }

      recorder.start(500)
      setRecording(true)
      setVoiceBusy(false)

      recordingTimer.current = setInterval(
        () => {
          setRecordSeconds((current) =>
            Math.min(current + 1, 20)
          )
        },
        1000
      )

      recordingStopTimer.current = setTimeout(
        stopVoiceRecording,
        20000
      )
    } catch {
      mediaStream.current
        ?.getTracks()
        .forEach((track) => track.stop())

      mediaStream.current = null
      setVoiceBusy(false)
      setRecording(false)

      setError(
        'Microphone permission is required to record a voice note.'
      )
    }
  }

  function removeVoice() {
    try {
      deleteVoice(report.id)
      setVoice(null)
      setRecordSeconds(0)
      setError('')
    } catch {
      setError(
        'The voice note could not be removed from local storage.'
      )
    }
  }

  function next() {
    setError('')

    if (
      step === 0 &&
      !report.issue
    ) {
      setError(
        'Choose the problem to continue.'
      )

      return
    }

    if (step === 1) {
      const key =
        safety === 0
          ? 'danger'
          : 'exposed'

      if (!report[key]) {
        setError(
          'Choose an answer to continue.'
        )

        return
      }

      if (safety === 0) {
        setSafety(1)
        return
      }
    }

    if (
      step === 2 &&
      !report.location &&
      !report.landmark.trim()
    ) {
      setError(
        'Add a landmark or capture your location.'
      )

      return
    }

    setStep((current) =>
      Math.min(current + 1, 3)
    )
  }

  function back() {
    setError('')

    if (
      step === 1 &&
      safety === 1
    ) {
      setSafety(0)
    } else {
      setStep((current) =>
        Math.max(0, current - 1)
      )

      if (step === 2) {
        setSafety(1)
      }
    }
  }

  function capture() {
    if (!navigator.geolocation) {
      setError(
        'Location is unavailable. Enter a landmark instead.'
      )

      return
    }

    setFinding(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mounted.current) return

        change('location', {
          latitude:
            position.coords.latitude,

          longitude:
            position.coords.longitude,

          accuracy:
            position.coords.accuracy,

          capturedAt:
            new Date(
              position.timestamp
            ).toISOString(),
        })

        setFinding(false)
      },

      () => {
        if (!mounted.current) return

        setFinding(false)

        setError(
          'Location unavailable or permission denied. You can enter a landmark instead.'
        )
      },

      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 12000,
      }
    )
  }

  function finish(send) {
    if (saving) return

    setSaving(true)

    try {
      const cleanReport =
        validate(report)

      if (
        onSave(
          cleanReport,
          send
        )
      ) {
        localStorage.removeItem(
          DRAFT
        )
      } else {
        setError(
          'Could not save your report. Check the message and try again.'
        )

        setSaving(false)
      }
    } catch (e) {
      setError(e.message)

      setSaving(false)
    }
  }

  const heading =
    step === 0
      ? 'What happened?'
      : step === 1
        ? safety === 0
          ? 'First, is anyone in danger?'
          : 'Are you exposed to traffic?'
        : step === 2
          ? 'Where are you?'
          : 'Ready when you are.'

  const safetyKey =
    safety === 0
      ? 'danger'
      : 'exposed'

  const summary = triage(report)

  return (
    <dialog
      ref={dialog}
      className="journey-dialog"
      aria-labelledby="journey-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div className="wizard-top">
        <span className="logo">
          <span className="logo-icon">
            <Zap
              size={21}
              fill="currentColor"
            />
          </span>

          SatResQ

          <span className="logo-dot">
            .
          </span>
        </span>

        <span className="draft-status">
          <ShieldCheck size={15} />

          {storageError
            ? 'Draft not saved · storage unavailable'
            : 'Draft saved on this device'}
        </span>

        <button
          className="icon-btn"
          aria-label="Save and close journey"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div className="wizard-layout">
        <aside className="wizard-aside">
          <p className="eyebrow">
            YOUR NEXT STEP STARTS HERE
          </p>

          <h2>
            A little detail.
            <br />

            <em>A clearer path.</em>
          </h2>

          <ol>
            {titles.map(
              (item, i) => (
                <li
                  className={
                    i === step
                      ? 'current'
                      : i < step
                        ? 'done'
                        : ''
                  }
                  key={item}
                  aria-current={
                    i === step
                      ? 'step'
                      : undefined
                  }
                >
                  <span>
                    {i < step ? (
                      <Check size={16} />
                    ) : (
                      String(
                        i + 1
                      ).padStart(
                        2,
                        '0'
                      )
                    )}
                  </span>

                  <div>
                    <b>{item}</b>

                    <small>
                      {
                        [
                          'Choose your vehicle and issue',
                          'Tell us about the situation',
                          'Coordinates or a landmark',
                          'Check the details before delivery',
                        ][i]
                      }
                    </small>
                  </div>
                </li>
              )
            )}
          </ol>

          <div className="wizard-reassurance">
            <WifiOff size={22} />

            <p>
              Connection can wait.
              <br />

              <b>
                Your report stays with you.
              </b>
            </p>

            <small>
              Nothing is sent until you choose
              “Send request”. This is a local
              demonstration.
            </small>
          </div>
        </aside>

        <section className="wizard-main">
          <div className="wizard-progress">
            <span>
              STEP{' '}
              {String(
                step + 1
              ).padStart(
                2,
                '0'
              )}{' '}
              / 04
            </span>

            <div>
              <span
                style={{
                  width:
                    (step + 1) *
                      25 +
                    '%',
                }}
              />
            </div>
          </div>

          <div
            className="wizard-panel"
            key={
              step +
              '-' +
              safety
            }
          >
            <p className="eyebrow">
              {titles[step]}

              {step === 1 &&
                ` · QUESTION ${
                  safety + 1
                } OF 2`}
            </p>

            <h1
              id="journey-title"
              ref={title}
              tabIndex={-1}
            >
              {heading}
            </h1>

            <p className="wizard-intro">
              {step === 0
                ? 'Select the closest match. You can add more detail later.'
                : step === 1
                  ? safety === 0
                    ? 'Is anyone injured, or is there fire or immediate danger?'
                    : 'Is the vehicle blocking traffic, or are people exposed to moving traffic?'
                  : step === 2
                    ? 'A road name or nearby landmark works when location detection doesn’t.'
                    : 'Check your report. You decide whether to send now or save it for later.'}
            </p>

            {/* STEP 1 — PROBLEM */}

            {step === 0 && (
              <>
                {vehicleProfile && (
                  <div
                    className={
                      'saved-vehicle-card ' +
                      (useSavedVehicle
                        ? 'active'
                        : '')
                    }
                  >
                    <div className="saved-vehicle-main">
                      <span className="saved-vehicle-icon">
                        <Car size={20} />
                      </span>

                      <span>
                        <small>
                          SAVED VEHICLE
                        </small>

                        <b>
                          {[
                            vehicleProfile.make,
                            vehicleProfile.model,
                          ]
                            .filter(Boolean)
                            .join(' ') ||
                            vehicleProfile.vehicleType}
                        </b>

                        <em>
                          {[
                            vehicleProfile.vehicleType,
                            vehicleProfile.fuelType,
                            vehicleProfile.registration,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </em>
                      </span>
                    </div>

                    <button
                      type="button"
                      className={
                        useSavedVehicle
                          ? 'btn secondary'
                          : 'btn primary'
                      }
                      onClick={chooseSavedVehicle}
                    >
                      {useSavedVehicle ? (
                        <>
                          <Check size={16} />
                          Using saved vehicle
                        </>
                      ) : (
                        <>
                          Use saved vehicle
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    <p>
                      Stored locally on this device.
                      You can choose another vehicle
                      below for this request.
                    </p>
                  </div>
                )}

                <fieldset className="vehicle-picker">
                  <legend>
                    Your vehicle
                  </legend>

                  {vehicles.map(
                    (vehicle) => (
                      <button
                        type="button"
                        key={vehicle}
                        aria-pressed={
                          report.vehicle ===
                          vehicle
                        }
                        className={
                          report.vehicle ===
                          vehicle
                            ? 'chosen'
                            : ''
                        }
                        onClick={() =>
                          chooseVehicle(vehicle)
                        }
                      >
                        {vehicle ===
                          'Car' && (
                          <Car size={17} />
                        )}

                        {vehicle}
                      </button>
                    )
                  )}
                </fieldset>

                <div
                  className="issue-grid"
                  role="group"
                  aria-label="Main problem"
                >
                  {issues.map(
                    (issue, i) => {
                      const Icon =
                        icons[i]

                      return (
                        <button
                          key={issue}
                          type="button"
                          aria-pressed={
                            report.issue ===
                            issue
                          }
                          className={
                            'issue-card ' +
                            (report.issue ===
                            issue
                              ? 'chosen'
                              : '')
                          }
                          onClick={() =>
                            change(
                              'issue',
                              issue
                            )
                          }
                        >
                          <span className="issue-icon">
                            <Icon size={30} />
                          </span>

                          <span>
                            <b>{issue}</b>

                            <small>
                              {
                                descriptions[
                                  i
                                ]
                              }
                            </small>
                          </span>

                          <span className="choice-check">
                            {report.issue ===
                              issue && (
                              <Check
                                size={13}
                              />
                            )}
                          </span>
                        </button>
                      )
                    }
                  )}
                </div>

                <section className="breakdown-media-card">
                  <div className="breakdown-media-head">
                    <span className="breakdown-media-icon">
                      <Camera size={21} />
                    </span>

                    <span>
                      <small>
                        PHOTO-ASSISTED REPORTING
                      </small>

                      <b>
                        Can't explain the problem clearly?
                      </b>

                      <em>
                        Add a photo of what you can see.
                      </em>
                    </span>
                  </div>

                  <input
                    ref={photoInput}
                    className="breakdown-photo-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={addPhoto}
                  />

                  {!photo ? (
                    <button
                      type="button"
                      className="breakdown-photo-add"
                      disabled={photoBusy}
                      onClick={() =>
                        photoInput.current?.click()
                      }
                    >
                      <ImagePlus size={19} />

                      {photoBusy
                        ? 'Preparing photo…'
                        : 'Take / upload photo'}
                    </button>
                  ) : (
                    <div className="breakdown-photo-preview">
                      <img
                        src={photo.dataUrl}
                        alt="Breakdown attachment preview"
                      />

                      <div>
                        <b>
                          Photo attached
                        </b>

                        <small>
                          {prettySize(photo.size)}
                          {' · '}
                          stored locally
                        </small>

                        <p>
                          This image stays linked to this
                          request on this device. It is not
                          placed inside the compact
                          emergency packet.
                        </p>

                        <div className="breakdown-photo-actions">
                          <button
                            type="button"
                            className="btn secondary"
                            disabled={photoBusy}
                            onClick={() =>
                              photoInput.current?.click()
                            }
                          >
                            <Camera size={16} />

                            Replace
                          </button>

                          <button
                            type="button"
                            className="text-btn danger-text"
                            onClick={removePhoto}
                          >
                            <Trash2 size={16} />

                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <small className="breakdown-media-note">
                    Useful for visible damage, warning
                    lights, smoke/steam, leaks or a flat
                    tyre. The photo does not diagnose the
                    vehicle.
                  </small>
                </section>

                <section className="breakdown-media-card voice-report-card">
                  <div className="breakdown-media-head">
                    <span className="breakdown-media-icon">
                      <Mic size={21} />
                    </span>

                    <span>
                      <small>
                        VOICE-ASSISTED REPORTING
                      </small>

                      <b>
                        Easier to say than type?
                      </b>

                      <em>
                        Record a short description of what happened.
                      </em>
                    </span>
                  </div>

                  {!voice ? (
                    <div className="voice-recorder-empty">
                      {!recording ? (
                        <button
                          type="button"
                          className="breakdown-photo-add"
                          disabled={voiceBusy}
                          onClick={startVoiceRecording}
                        >
                          <Mic size={19} />

                          {voiceBusy
                            ? 'Opening microphone…'
                            : 'Record voice note'}
                        </button>
                      ) : (
                        <div className="voice-recording-live">
                          <span className="voice-recording-dot" />

                          <span>
                            <b>Recording…</b>
                            <small>
                              {recordSeconds}s / 20s maximum
                            </small>
                          </span>

                          <button
                            type="button"
                            className="btn primary"
                            onClick={stopVoiceRecording}
                          >
                            <Square size={15} fill="currentColor" />
                            Stop & save
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="voice-note-preview">
                      <span className="voice-note-icon">
                        <Volume2 size={22} />
                      </span>

                      <div>
                        <b>Voice note attached</b>

                        <small>
                          {prettyDuration(voice.duration)}
                          {' · '}
                          {prettySize(voice.size)}
                          {' · '}
                          stored locally
                        </small>

                        <audio
                          controls
                          preload="metadata"
                          src={voice.dataUrl}
                        />

                        <p>
                          The voice note stays outside the
                          compact emergency packet and can be
                          transferred separately when a suitable
                          connection is available.
                        </p>

                        <div className="breakdown-photo-actions">
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={startVoiceRecording}
                          >
                            <Mic size={16} />
                            Record again
                          </button>

                          <button
                            type="button"
                            className="text-btn danger-text"
                            onClick={removeVoice}
                          >
                            <Trash2 size={16} />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <small className="breakdown-media-note">
                    Keep it short: what happened, what you can
                    hear or see, and anything unusual. Maximum
                    recording time is 20 seconds.
                  </small>
                </section>

                {report.issue && (
                  <OfflineAssistant
                    report={report}
                  />
                )}
              </>
            )}

            {/* STEP 2 — SAFETY */}

            {step === 1 && (
              <>
                <div
                  className="safety-choices"
                  role="group"
                  aria-label={heading}
                >
                  {[
                    [
                      'no',
                      'No',
                      safety === 0
                        ? 'No immediate danger reported'
                        : 'No traffic exposure reported',
                    ],

                    [
                      'yes',
                      'Yes',
                      safety === 0
                        ? 'Someone may need urgent help'
                        : 'People or the vehicle are exposed',
                    ],

                    [
                      'unknown',
                      'Not sure',
                      'Flag this for urgent review',
                    ],
                  ].map(
                    ([
                      value,
                      label,
                      detail,
                    ]) => (
                      <button
                        type="button"
                        aria-pressed={
                          report[
                            safetyKey
                          ] === value
                        }
                        className={
                          report[
                            safetyKey
                          ] === value
                            ? 'chosen'
                            : ''
                        }
                        key={value}
                        onClick={() =>
                          change(
                            safetyKey,
                            value
                          )
                        }
                      >
                        <span className="choice-check">
                          {report[
                            safetyKey
                          ] === value && (
                            <Check
                              size={14}
                            />
                          )}
                        </span>

                        <span>
                          <b>{label}</b>

                          <small>
                            {detail}
                          </small>
                        </span>

                        <ChevronRight
                          size={20}
                        />
                      </button>
                    )
                  )}
                </div>

                {report.danger ===
                'yes' ? (
                  <div
                    className="alert danger"
                    role="alert"
                  >
                    Contact local emergency
                    services through an
                    available channel. This
                    prototype cannot summon
                    help. Do not wait to finish
                    this form.
                  </div>
                ) : (
                  <div className="wizard-note">
                    <ShieldCheck size={20} />

                    <p>
                      These answers help set the
                      report’s priority.
                      <br />

                      If you are uncertain,
                      choose “Not sure”.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* STEP 3 — LOCATION */}

            {step === 2 && (
              <>
                <button
                  className="location-choice"
                  type="button"
                  onClick={capture}
                  disabled={finding}
                >
                  <span>
                    <Navigation size={25} />
                  </span>

                  <div>
                    <b>
                      {finding
                        ? 'Finding your location…'
                        : report.location
                          ? 'Capture location again'
                          : 'Use my location'}
                    </b>

                    <small>
                      Your browser will ask for
                      permission.
                    </small>
                  </div>

                  <ArrowRight size={20} />
                </button>

                {report.location && (
                  <div className="location-captured">
                    <MapPin size={20} />

                    <span>
                      {report.location.latitude.toFixed(
                        6
                      )}
                      ,{' '}
                      {report.location.longitude.toFixed(
                        6
                      )}

                      <small>
                        Accuracy ±
                        {Math.round(
                          report.location
                            .accuracy
                        )}{' '}
                        m ·{' '}
                        {new Date(
                          report.location
                            .capturedAt
                        ).toLocaleString()}
                      </small>
                    </span>

                    <button
                      type="button"
                      aria-label="Remove location"
                      onClick={() =>
                        change(
                          'location',
                          null
                        )
                      }
                    >
                      <X size={17} />
                    </button>
                  </div>
                )}

                <div className="or-rule">
                  <span>
                    OR ADD A LANDMARK
                  </span>
                </div>

                <label htmlFor="landmark">
                  Road, landmark or direction
                  of travel
                </label>

                <input
                  id="landmark"
                  maxLength={300}
                  value={
                    report.landmark
                  }
                  placeholder="e.g. Northbound rest stop, marker 42"
                  onChange={(e) =>
                    change(
                      'landmark',
                      e.target.value
                    )
                  }
                />

                <label htmlFor="notes">
                  Anything else?{' '}

                  <span className="muted">
                    Optional
                  </span>
                </label>

                <textarea
                  id="notes"
                  rows={3}
                  maxLength={500}
                  value={report.notes}
                  placeholder="Describe anything else you noticed…"
                  onChange={(e) =>
                    change(
                      'notes',
                      e.target.value
                    )
                  }
                />

                <small className="muted">
                  {report.notes.length}/500 ·
                  Notes are saved but not
                  interpreted by the priority
                  rules.
                </small>
              </>
            )}

            {/* STEP 4 — REVIEW */}

            {step === 3 && (
              <>
                <div className="review-card">
                  <div className="review-top">
                    <span className="issue-icon">
                      <CheckCircle2
                        size={27}
                      />
                    </span>

                    <div>
                      <small>
                        YOUR ROADSIDE REPORT
                      </small>

                      <h2>
                        {report.issue}
                      </h2>
                    </div>

                    <button
                      className="text-btn"
                      onClick={() =>
                        setStep(0)
                      }
                    >
                      Edit
                    </button>
                  </div>

                  <dl>
                    <dt>
                      Vehicle
                    </dt>

                    <dd>
                      {report.vehicle}

                      {report.vehicleProfile && (
                        <small>
                          {[
                            report.vehicleProfile.make,
                            report.vehicleProfile.model,
                            report.vehicleProfile.fuelType,
                            report.vehicleProfile.registration,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </small>
                      )}
                    </dd>

                    <dt>
                      Immediate danger
                    </dt>

                    <dd>
                      {report.danger ===
                      'unknown'
                        ? 'Not sure'
                        : report.danger}
                    </dd>

                    <dt>
                      Traffic exposure
                    </dt>

                    <dd>
                      {report.exposed ===
                      'unknown'
                        ? 'Not sure'
                        : report.exposed}
                    </dd>

                    <dt>
                      Location
                    </dt>

                    <dd>
                      {report.landmark ||
                        'Coordinates captured'}

                      {report.location && (
                        <small>
                          {report.location.latitude.toFixed(
                            6
                          )}
                          ,{' '}
                          {report.location.longitude.toFixed(
                            6
                          )}{' '}
                          · ±
                          {Math.round(
                            report.location
                              .accuracy
                          )}{' '}
                          m
                        </small>
                      )}
                    </dd>

                    {report.notes && (
                      <>
                        <dt>
                          Notes
                        </dt>

                        <dd>
                          {report.notes}
                        </dd>
                      </>
                    )}
                  </dl>

                  {photo && (
                    <div className="review-media-attachment">
                      <img
                        src={photo.dataUrl}
                        alt="Attached breakdown"
                      />

                      <span>
                        <small>
                          BREAKDOWN PHOTO
                        </small>

                        <b>
                          Visual evidence attached
                        </b>

                        <em>
                          {prettySize(photo.size)}
                          {' · '}
                          stored on this device
                        </em>
                      </span>

                      <button
                        type="button"
                        className="text-btn"
                        onClick={() =>
                          setStep(0)
                        }
                      >
                        Edit
                      </button>
                    </div>
                  )}

                  {voice && (
                    <div className="review-media-attachment review-voice-attachment">
                      <span className="voice-note-icon">
                        <Volume2 size={21} />
                      </span>

                      <span>
                        <small>
                          VOICE NOTE
                        </small>

                        <b>
                          Spoken description attached
                        </b>

                        <em>
                          {prettyDuration(voice.duration)}
                          {' · '}
                          {prettySize(voice.size)}
                          {' · '}
                          stored on this device
                        </em>
                      </span>

                      <button
                        type="button"
                        className="text-btn"
                        onClick={() =>
                          setStep(0)
                        }
                      >
                        Edit
                      </button>
                    </div>
                  )}

                  {report.vehicleProfile && (
                    <div className="profile-link-note">
                      <Car size={18} />

                      <span>
                        <b>
                          Saved vehicle included in this
                          request
                        </b>

                        <small>
                          Make, model, registration and
                          fuel type are now included in
                          the compact version 2 emergency
                          packet sent to the demo receiver.
                        </small>
                      </span>
                    </div>
                  )}

                  <div
                    className={
                      'review-priority priority-' +
                      summary.rank
                    }
                  >
                    <ShieldCheck size={19} />

                    <span>
                      <b>
                        {summary.priority}
                      </b>

                      <small>
                        {summary.reason}
                      </small>
                    </span>
                  </div>
                </div>

                {(photo || voice) && (
                  <div className="wizard-note">
                    {voice ? (
                      <Volume2 size={20} />
                    ) : (
                      <Camera size={20} />
                    )}

                    <p>
                      Your photo and/or voice note are saved
                      locally as rich evidence. The compact
                      emergency packet stays lightweight;
                      media can be transferred separately
                      when a suitable connection is available.
                    </p>
                  </div>
                )}

                <RescueSummaryCard
                  report={report}
                />

                <ConnectivityPanel
                  report={report}
                />

                <EmergencyHandoff
                  report={report}
                />

                <SafetyGuidanceCard
                  report={report}
                />

                <div className="wizard-note">
                  <WifiOff size={20} />

                  <p>
                    If the connection is
                    unavailable, your
                    authorised request stays
                    queued. Automatic retries
                    work while the app is open
                    and auto-retry is enabled.
                  </p>
                </div>

                {report.danger ===
                  'yes' && (
                  <div className="alert danger">
                    This demo cannot send
                    emergency assistance. Do
                    not wait for a demo receipt
                    to seek help.
                  </div>
                )}
              </>
            )}

            {storageError && (
              <p
                className="alert danger"
                role="alert"
              >
                Browser storage is unavailable.
                Your draft cannot survive
                closing or refreshing this
                page.
              </p>
            )}

            {error && (
              <p
                className="alert danger"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>

          <div className="wizard-actions">
            <button
              className="text-btn"
              onClick={
                step === 0
                  ? onClose
                  : back
              }
            >
              <ArrowLeft size={16} />

              {step === 0
                ? 'Save & close'
                : 'Back'}
            </button>

            {step < 3 ? (
              <button
                className="btn primary"
                disabled={finding}
                onClick={next}
              >
                Continue

                <ArrowRight size={18} />
              </button>
            ) : (
              <div>
                <button
                  className="btn secondary"
                  disabled={
                    saving ||
                    storageError
                  }
                  onClick={() =>
                    finish(false)
                  }
                >
                  Save for later
                </button>

                <button
                  className="btn primary"
                  disabled={
                    saving ||
                    storageError
                  }
                  onClick={() =>
                    finish(true)
                  }
                >
                  Send request

                  <Send size={17} />
                </button>
              </div>
            )}
          </div>

          <p className="wizard-footnote">
            Prototype only · Rule-based priority
            · No real assistance dispatched
          </p>
        </section>
      </div>
    </dialog>
  )
}