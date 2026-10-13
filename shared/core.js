export const vehicles = [
  'Car',
  'Motorcycle',
  'Van',
  'Truck',
  'Other',
]

export const issues = [
  'Flat or damaged tyre',
  'Vehicle will not start',
  'Out of fuel',
  'Engine overheating',
  'Other / Not sure',
]

export const answers = [
  'no',
  'yes',
  'unknown',
]

export const fuelTypes = [
  'Petrol',
  'Diesel',
  'CNG',
  'Hybrid',
  'Electric',
  'Other',
]

export const stages = [
  'Received',
  'Accepted',
  'En route',
  'Resolved',
]

const assistanceByIssue = {
  'Flat or damaged tyre':
    'Tyre assistance',

  'Vehicle will not start':
    'Starting-system assessment',

  'Out of fuel':
    'Fuel assistance',

  'Engine overheating':
    'Mechanical assessment / possible towing',

  'Other / Not sure':
    'General roadside assessment',
}

const safetyByIssue = {
  'Flat or damaged tyre': {
    title:
      'Stay clear of moving traffic',

    steps: [
      'Move to a safer stopping position only if it can be done without increasing risk.',

      'Use hazard lights and keep passengers away from moving traffic where possible.',

      'Do not attempt a tyre change beside fast-moving traffic; wait for assistance.',
    ],
  },

  'Vehicle will not start': {
    title:
      'Avoid repeated start attempts',

    steps: [
      'Keep the vehicle secured and switch off non-essential electrical accessories.',

      'Avoid repeatedly cranking the engine if it does not start.',

      'Request a starting-system or battery assessment rather than guessing the fault.',
    ],
  },

  'Out of fuel': {
    title:
      'Stay with a safe stopping point',

    steps: [
      'Secure the vehicle and make it visible to other road users.',

      'Avoid walking along high-speed or poorly lit roads if doing so would expose you to traffic.',

      'Request fuel assistance or towing as appropriate for the location.',
    ],
  },

  'Engine overheating': {
    title:
      'Stop and let the engine cool',

    steps: [
      'Pull over safely and switch off the engine as soon as practical.',

      'Do not open the radiator or coolant cap while the engine is hot.',

      'Request mechanical assessment or towing if the temperature warning persists.',
    ],
  },

  'Other / Not sure': {
    title:
      'Prioritise safety over diagnosis',

    steps: [
      'Stop in the safest practical location and make the vehicle visible.',

      'Do not continue driving if there is smoke, fire, fluid loss, severe noise, or uncertain safety.',

      'Request a general roadside assessment and describe any symptoms you observed.',
    ],
  },
}

export function triage(r) {
  const help =
    assistanceByIssue[r.issue] ||
    'General roadside assessment'

  if (r.danger === 'yes') {
    return {
      priority:
        'Emergency',

      rank: 0,

      help:
        'Emergency services assessment',

      reason:
        'Immediate danger or injury reported.',
    }
  }

  if (
    r.danger !== 'no' ||
    r.exposed !== 'no'
  ) {
    return {
      priority:
        'Urgent review',

      rank: 1,

      help,

      reason:
        'Traffic exposure or an uncertain safety situation requires review.',
    }
  }

  return {
    priority:
      'Roadside assistance',

    rank: 2,

    help,

    reason:
      'No immediate danger or traffic exposure reported. This is not a guarantee of safety.',
  }
}

export function safetyGuidance(r) {
  if (
    r?.danger === 'yes'
  ) {
    return {
      title:
        'Immediate danger reported',

      level:
        'danger',

      steps: [
        'Contact local emergency services through any available channel.',

        'Move away from traffic, fire, or another immediate hazard if it is safe to do so.',

        'Do not wait for this demonstration system to dispatch assistance.',
      ],
    }
  }

  if (
    r?.exposed === 'yes' ||
    r?.danger === 'unknown' ||
    r?.exposed === 'unknown'
  ) {
    const base =
      safetyByIssue[
        r?.issue
      ] ||
      safetyByIssue[
        'Other / Not sure'
      ]

    return {
      title:
        'Safety situation needs review',

      level:
        'urgent',

      steps: [
        'Reduce exposure to moving traffic or other hazards if you can do so safely.',

        ...base.steps.slice(
          1
        ),
      ],
    }
  }

  const base =
    safetyByIssue[
      r?.issue
    ] ||
    safetyByIssue[
      'Other / Not sure'
    ]

  return {
    ...base,

    level:
      'routine',
  }
}

function cleanVehicleProfile(
  value,
  fail
) {
  if (
    value == null
  ) {
    return null
  }

  if (
    typeof value !==
      'object' ||
    Array.isArray(
      value
    )
  ) {
    fail(
      'Invalid vehicle profile'
    )
  }

  const make =
    typeof value.make ===
    'string'
      ? value.make.trim()
      : ''

  const model =
    typeof value.model ===
    'string'
      ? value.model.trim()
      : ''

  const registration =
    typeof value.registration ===
    'string'
      ? value.registration
          .trim()
          .toUpperCase()
      : ''

  const fuelType =
    typeof value.fuelType ===
    'string'
      ? value.fuelType
      : ''

  if (
    make.length > 40 ||
    model.length > 40 ||
    registration.length >
      20 ||
    !fuelTypes.includes(
      fuelType
    )
  ) {
    fail(
      'Invalid vehicle profile'
    )
  }

  return {
    make,
    model,
    registration,
    fuelType,
  }
}

export function validate(r) {
  const fail = (
    message
  ) => {
    throw new Error(
      message
    )
  }

  if (
    !r ||
    typeof r !==
      'object'
  ) {
    fail(
      'Report required'
    )
  }

  if (
    typeof r.id !==
      'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      r.id
    )
  ) {
    fail(
      'Invalid ID'
    )
  }

  if (
    !vehicles.includes(
      r.vehicle
    ) ||
    !issues.includes(
      r.issue
    )
  ) {
    fail(
      'Choose a vehicle and problem'
    )
  }

  if (
    !answers.includes(
      r.danger
    ) ||
    !answers.includes(
      r.exposed
    )
  ) {
    fail(
      'Answer both safety questions'
    )
  }

  if (
    typeof r.landmark !==
      'string' ||
    r.landmark.length >
      300 ||
    typeof r.notes !==
      'string' ||
    r.notes.length >
      500
  ) {
    fail(
      'Invalid text length'
    )
  }

  if (
    typeof r.createdAt !==
      'string' ||
    !Number.isFinite(
      Date.parse(
        r.createdAt
      )
    )
  ) {
    fail(
      'Invalid report time'
    )
  }

  let location =
    null

  if (
    r.location != null
  ) {
    const l =
      r.location

    if (
      !Number.isFinite(
        l.latitude
      ) ||
      Math.abs(
        l.latitude
      ) > 90 ||
      !Number.isFinite(
        l.longitude
      ) ||
      Math.abs(
        l.longitude
      ) > 180 ||
      !Number.isFinite(
        l.accuracy
      ) ||
      l.accuracy < 0 ||
      typeof l.capturedAt !==
        'string' ||
      !Number.isFinite(
        Date.parse(
          l.capturedAt
        )
      )
    ) {
      fail(
        'Invalid location'
      )
    }

    location = {
      latitude:
        l.latitude,

      longitude:
        l.longitude,

      accuracy:
        l.accuracy,

      capturedAt:
        new Date(
          l.capturedAt
        ).toISOString(),
    }
  }

  if (
    !location &&
    !r.landmark.trim()
  ) {
    fail(
      'Add a location or landmark'
    )
  }

  const vehicleProfile =
    cleanVehicleProfile(
      r.vehicleProfile,
      fail
    )

  return {
    id:
      r.id,

    vehicle:
      r.vehicle,

    vehicleProfile,

    issue:
      r.issue,

    danger:
      r.danger,

    exposed:
      r.exposed,

    landmark:
      r.landmark.trim(),

    notes:
      r.notes.trim(),

    createdAt:
      new Date(
        r.createdAt
      ).toISOString(),

    location,
  }
}

export function encode(
  input
) {
  const r =
    validate(
      input
    )

  const packet = {
    v:
      r.vehicleProfile
        ? 2
        : 1,

    id:
      r.id,

    t:
      Date.parse(
        r.createdAt
      ),

    c:
      vehicles.indexOf(
        r.vehicle
      ),

    i:
      issues.indexOf(
        r.issue
      ),

    d:
      answers.indexOf(
        r.danger
      ),

    e:
      answers.indexOf(
        r.exposed
      ),

    l:
      r.location
        ? [
            r.location
              .latitude,

            r.location
              .longitude,

            r.location
              .accuracy,

            Date.parse(
              r.location
                .capturedAt
            ),
          ]
        : null,

    m:
      r.landmark,

    n:
      r.notes,
  }

  if (
    r.vehicleProfile
  ) {
    packet.x = [
      r.vehicleProfile
        .make,

      r.vehicleProfile
        .model,

      r.vehicleProfile
        .registration,

      fuelTypes.indexOf(
        r.vehicleProfile
          .fuelType
      ),
    ]
  }

  return packet
}

export function decode(
  p
) {
  if (
    !p ||
    ![1, 2].includes(
      p.v
    )
  ) {
    throw new Error(
      'Unsupported packet version'
    )
  }

  for (
    const [
      key,
      list,
    ] of [
      [
        'c',
        vehicles,
      ],

      [
        'i',
        issues,
      ],

      [
        'd',
        answers,
      ],

      [
        'e',
        answers,
      ],
    ]
  ) {
    if (
      !Number.isInteger(
        p[key]
      ) ||
      p[key] < 0 ||
      p[key] >=
        list.length
    ) {
      throw new Error(
        'Invalid packet code'
      )
    }
  }

  if (
    !Number.isFinite(
      p.t
    )
  ) {
    throw new Error(
      'Invalid packet time'
    )
  }

  if (
    p.l !== null &&
    (
      !Array.isArray(
        p.l
      ) ||
      p.l.length !==
        4 ||
      !Number.isFinite(
        p.l[3]
      )
    )
  ) {
    throw new Error(
      'Invalid packet location'
    )
  }

  let vehicleProfile =
    null

  if (
    p.v === 2
  ) {
    if (
      !Array.isArray(
        p.x
      ) ||
      p.x.length !==
        4 ||
      typeof p.x[0] !==
        'string' ||
      typeof p.x[1] !==
        'string' ||
      typeof p.x[2] !==
        'string' ||
      !Number.isInteger(
        p.x[3]
      ) ||
      p.x[3] < 0 ||
      p.x[3] >=
        fuelTypes.length
    ) {
      throw new Error(
        'Invalid vehicle profile packet'
      )
    }

    vehicleProfile = {
      make:
        p.x[0],

      model:
        p.x[1],

      registration:
        p.x[2],

      fuelType:
        fuelTypes[
          p.x[3]
        ],
    }
  }

  return validate({
    id:
      p.id,

    vehicle:
      vehicles[
        p.c
      ],

    vehicleProfile,

    issue:
      issues[
        p.i
      ],

    danger:
      answers[
        p.d
      ],

    exposed:
      answers[
        p.e
      ],

    landmark:
      p.m,

    notes:
      p.n,

    createdAt:
      new Date(
        p.t
      ).toISOString(),

    location:
      p.l
        ? {
            latitude:
              p.l[0],

            longitude:
              p.l[1],

            accuracy:
              p.l[2],

            capturedAt:
              new Date(
                p.l[3]
              ).toISOString(),
          }
        : null,
  })
}

export const bytes = (
  object
) =>
  new TextEncoder().encode(
    typeof object ===
      'string'
      ? object
      : JSON.stringify(
          object
        )
  ).length