import {
  Car,
  CheckCircle2,
  Fuel,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react'

import {
  useEffect,
  useState,
} from 'react'

const STORAGE_KEY =
  'satresq-vehicle-profile-v1'

const EMPTY_PROFILE = {
  vehicleType: 'Car',
  make: '',
  model: '',
  registration: '',
  fuelType: 'Petrol',
  provider: '',
  notes: '',
}

export function readVehicleProfile() {
  try {
    const saved =
      JSON.parse(
        localStorage.getItem(
          STORAGE_KEY
        ) || 'null'
      )

    if (!saved) {
      return null
    }

    return {
      ...EMPTY_PROFILE,
      ...saved,
    }
  } catch {
    return null
  }
}

export default function VehicleProfile() {
  const [
    profile,
    setProfile,
  ] = useState(
    EMPTY_PROFILE
  )

  const [
    saved,
    setSaved,
  ] = useState(false)

  const [
    exists,
    setExists,
  ] = useState(false)

  useEffect(() => {
    const existing =
      readVehicleProfile()

    if (existing) {
      setProfile(existing)
      setExists(true)
    }
  }, [])

  function update(
    field,
    value
  ) {
    setSaved(false)

    setProfile(
      (current) => ({
        ...current,
        [field]: value,
      })
    )
  }

  function saveProfile(
    event
  ) {
    event.preventDefault()

    const cleaned = {
      vehicleType:
        profile.vehicleType,

      make:
        profile.make.trim(),

      model:
        profile.model.trim(),

      registration:
        profile.registration
          .trim()
          .toUpperCase(),

      fuelType:
        profile.fuelType,

      provider:
        profile.provider.trim(),

      notes:
        profile.notes.trim(),
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        cleaned
      )
    )

    setProfile(cleaned)
    setExists(true)
    setSaved(true)

    window.dispatchEvent(
      new CustomEvent(
        'vehicle-profile-change'
      )
    )
  }

  function clearProfile() {
    if (
      !confirm(
        'Remove the saved vehicle profile from this device?'
      )
    ) {
      return
    }

    localStorage.removeItem(
      STORAGE_KEY
    )

    setProfile(
      EMPTY_PROFILE
    )

    setExists(false)
    setSaved(false)

    window.dispatchEvent(
      new CustomEvent(
        'vehicle-profile-change'
      )
    )
  }

  return (
    <section className="vehicle-profile-page">

      <div className="vehicle-profile-hero">

        <div className="vehicle-profile-icon">
          <Car size={30} />
        </div>

        <div>
          <p className="eyebrow">
            OFFLINE VEHICLE IDENTITY
          </p>

          <h2>
            Your vehicle, ready before you need help.
          </h2>

          <p>
            Save essential vehicle information locally so SatResQ can reduce the amount of information you need to enter during a roadside emergency.
          </p>
        </div>

      </div>

      <form
        className="card vehicle-profile-card"
        onSubmit={
          saveProfile
        }
      >

        <div className="vehicle-profile-heading">

          <div>
            <span className="eyebrow">
              VEHICLE PROFILE
            </span>

            <h3>
              Primary vehicle
            </h3>
          </div>

          {exists && (
            <span className="vehicle-profile-status">
              <CheckCircle2
                size={15}
              />

              Saved locally
            </span>
          )}

        </div>

        <div className="vehicle-profile-grid">

          <label>
            <span>
              Vehicle type
            </span>

            <select
              value={
                profile.vehicleType
              }
              onChange={(
                event
              ) =>
                update(
                  'vehicleType',
                  event.target.value
                )
              }
            >
              <option>
                Car
              </option>

              <option>
                Motorcycle
              </option>

              <option>
                Van
              </option>

              <option>
                Truck
              </option>

              <option>
                Other
              </option>
            </select>
          </label>

          <label>
            <span>
              Fuel / power
            </span>

            <select
              value={
                profile.fuelType
              }
              onChange={(
                event
              ) =>
                update(
                  'fuelType',
                  event.target.value
                )
              }
            >
              <option>
                Petrol
              </option>

              <option>
                Diesel
              </option>

              <option>
                CNG
              </option>

              <option>
                Hybrid
              </option>

              <option>
                Electric
              </option>

              <option>
                Other
              </option>
            </select>
          </label>

          <label>
            <span>
              Make
            </span>

            <input
              value={
                profile.make
              }
              onChange={(
                event
              ) =>
                update(
                  'make',
                  event.target.value
                )
              }
              placeholder="e.g. Hyundai"
              maxLength={40}
            />
          </label>

          <label>
            <span>
              Model
            </span>

            <input
              value={
                profile.model
              }
              onChange={(
                event
              ) =>
                update(
                  'model',
                  event.target.value
                )
              }
              placeholder="e.g. Creta"
              maxLength={40}
            />
          </label>

          <label>
            <span>
              Registration number
            </span>

            <input
              value={
                profile.registration
              }
              onChange={(
                event
              ) =>
                update(
                  'registration',
                  event.target.value
                )
              }
              placeholder="e.g. TS09AB1234"
              maxLength={20}
            />
          </label>

          <label>
            <span>
              Roadside provider
            </span>

            <input
              value={
                profile.provider
              }
              onChange={(
                event
              ) =>
                update(
                  'provider',
                  event.target.value
                )
              }
              placeholder="Optional"
              maxLength={60}
            />
          </label>

        </div>

        <label className="vehicle-profile-notes">

          <span>
            Vehicle notes
          </span>

          <textarea
            value={
              profile.notes
            }
            onChange={(
              event
            ) =>
              update(
                'notes',
                event.target.value
              )
            }
            placeholder="Optional notes such as spare tyre availability, recurring issue, EV charging adapter, etc."
            maxLength={300}
          />

          <small>
            {
              profile.notes.length
            }
            /300
          </small>

        </label>

        <div className="vehicle-profile-info">

          <ShieldCheck
            size={18}
          />

          <span>
            <b>
              Stored locally.
            </b>{' '}
            This profile stays in this browser and does not automatically send vehicle information to a responder.
          </span>

        </div>

        <div className="vehicle-profile-actions">

          <button
            type="submit"
            className="btn primary"
          >
            <Save
              size={17}
            />

            Save vehicle profile
          </button>

          {exists && (
            <button
              type="button"
              className="btn secondary"
              onClick={
                clearProfile
              }
            >
              <Trash2
                size={16}
              />

              Remove profile
            </button>
          )}

        </div>

        {saved && (
          <div className="vehicle-profile-saved">
            <CheckCircle2
              size={17}
            />

            Vehicle profile saved and available offline.
          </div>
        )}

      </form>

      <section className="vehicle-profile-benefits">

        <div>
          <Car size={20} />

          <span>
            <b>
              Faster reporting
            </b>

            Reuse basic vehicle details during a breakdown.
          </span>
        </div>

        <div>
          <Fuel size={20} />

          <span>
            <b>
              Better assistance selection
            </b>

            Vehicle and fuel type can help determine the right roadside resource.
          </span>
        </div>

        <div>
          <ShieldCheck
            size={20}
          />

          <span>
            <b>
              Offline available
            </b>

            No server is required to retrieve the saved profile.
          </span>
        </div>

      </section>

    </section>
  )
}