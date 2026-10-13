import {
  AlertTriangle,
  BatteryCharging,
  Check,
  ChevronRight,
  CircleDot,
  Fuel,
  ShieldCheck,
  Thermometer,
  Wrench,
} from 'lucide-react'

import {
  useMemo,
  useState,
} from 'react'


const guides = {
  'Flat or damaged tyre': {
    icon: CircleDot,
    title: 'Tyre problem check',
    intro:
      'A few simple observations can help determine whether you should wait for roadside assistance.',
    questions: [
      {
        id: 'driveable',
        text:
          'Does the tyre still appear inflated enough to move the vehicle safely?',
      },
      {
        id: 'spare',
        text:
          'Do you have a usable spare tyre or repair kit?',
      },
      {
        id: 'safe-place',
        text:
          'Is the vehicle completely away from moving traffic?',
      },
    ],
    safe: [
      'Turn on hazard lights.',
      'Keep passengers away from moving traffic.',
      'Do not attempt a tyre change beside fast-moving traffic.',
    ],
    assistance:
      'Tyre assistance',
  },

  'Vehicle will not start': {
    icon: BatteryCharging,
    title: 'Starting problem check',
    intro:
      'These observations help describe the problem without attempting a mechanical diagnosis.',
    questions: [
      {
        id: 'lights',
        text:
          'Do the dashboard or interior lights switch on?',
      },
      {
        id: 'click',
        text:
          'Do you hear clicking when you try to start the vehicle?',
      },
      {
        id: 'crank',
        text:
          'Does the engine turn over but fail to start?',
      },
    ],
    safe: [
      'Keep the vehicle secured and use hazard lights when appropriate.',
      'Avoid repeated starting attempts if you smell fuel, see smoke, or notice overheating.',
      'Do not touch exposed battery terminals unless you know how to do so safely.',
    ],
    assistance:
      'Battery / mechanical assistance',
  },

  'Out of fuel': {
    icon: Fuel,
    title: 'Fuel assistance check',
    intro:
      'SatResQ can help prepare the information needed for fuel delivery or roadside assistance.',
    questions: [
      {
        id: 'fuel-confirmed',
        text:
          'Does the fuel gauge indicate empty or near empty?',
      },
      {
        id: 'safe-stop',
        text:
          'Is the vehicle stopped somewhere clear of moving traffic?',
      },
      {
        id: 'station',
        text:
          'Is a fuel station safely accessible without walking along a dangerous roadway?',
      },
    ],
    safe: [
      'Secure the vehicle and use hazard lights if necessary.',
      'Do not walk along a high-speed road or unsafe shoulder to obtain fuel.',
      'Wait in a safer location when roadside fuel delivery is available.',
    ],
    assistance:
      'Fuel delivery',
  },

  'Engine overheating': {
    icon: Thermometer,
    title: 'Overheating safety check',
    intro:
      'Overheating can damage the vehicle and may create burn or fire hazards.',
    questions: [
      {
        id: 'warning',
        text:
          'Is the temperature warning light or gauge showing a high temperature?',
      },
      {
        id: 'steam',
        text:
          'Can you see steam or coolant coming from the engine area?',
      },
      {
        id: 'safe-stop',
        text:
          'Have you been able to stop the vehicle safely?',
      },
    ],
    safe: [
      'Stop driving as soon as it is safe to do so.',
      'Switch the engine off and allow it to cool.',
      'Do not open a radiator or coolant cap while the engine is hot.',
    ],
    assistance:
      'Mechanical assessment / possible towing',
  },

  'Other / Not sure': {
    icon: Wrench,
    title: 'General vehicle check',
    intro:
      'Describe what you can observe. SatResQ does not require you to diagnose the vehicle yourself.',
    questions: [
      {
        id: 'warning',
        text:
          'Are any dashboard warning lights visible?',
      },
      {
        id: 'noise',
        text:
          'Did you notice an unusual sound, smell, smoke, or vibration?',
      },
      {
        id: 'move',
        text:
          'Can the vehicle be moved safely?',
      },
    ],
    safe: [
      'Do not continue driving if you see smoke, fire, fluid leakage, or severe warning signs.',
      'Move away from traffic only when doing so does not create additional risk.',
      'Use your notes in SatResQ to describe exactly what you observed.',
    ],
    assistance:
      'Mechanical assessment',
  },
}


function AnswerButton({
  active,
  children,
  onClick,
}) {
  return (
    <button
      type="button"
      className={
        'offline-answer ' +
        (active ? 'active' : '')
      }
      onClick={onClick}
    >
      {active && (
        <Check size={13} />
      )}

      {children}
    </button>
  )
}


export default function OfflineAssistant({
  report,
}) {
  const guide =
    guides[report.issue] ||
    guides['Other / Not sure']

  const Icon =
    guide.icon

  const [
    answers,
    setAnswers,
  ] = useState({})

  const [
    expanded,
    setExpanded,
  ] = useState(false)


  const completed =
    Object.keys(answers).length


  const recommendation =
    useMemo(() => {
      if (
        report.danger === 'yes'
      ) {
        return {
          level: 'danger',
          title:
            'Emergency action takes priority',
          text:
            'Immediate danger has been reported. Use an available channel to contact local emergency services. Do not wait for roadside troubleshooting.',
        }
      }

      if (
        report.exposed === 'yes' ||
        report.danger === 'unknown' ||
        report.exposed === 'unknown'
      ) {
        return {
          level: 'urgent',
          title:
            'Prioritise personal safety',
          text:
            'The situation may involve traffic exposure or uncertain safety. Move to a safer position only when it can be done without increasing risk.',
        }
      }

      return {
        level: 'routine',
        title:
          `${guide.assistance} recommended`,
        text:
          'Based on the reported issue, continue with the roadside request and share the observations you have made with the responder.',
      }
    }, [
      report.danger,
      report.exposed,
      guide.assistance,
    ])


  function answer(
    id,
    value
  ) {
    setAnswers(
      (current) => ({
        ...current,
        [id]: value,
      })
    )
  }


  return (
    <section className="offline-assistant">

      <div className="offline-assistant-head">

        <span className="offline-assistant-icon">
          <Icon size={23} />
        </span>

        <div>
          <small>
            OFFLINE TROUBLESHOOTING
          </small>

          <h3>
            {guide.title}
          </h3>

          <p>
            {guide.intro}
          </p>
        </div>

        <span className="offline-badge">
          <ShieldCheck
            size={14}
          />

          ON DEVICE
        </span>

      </div>


      <button
        type="button"
        className="offline-assistant-toggle"
        onClick={() =>
          setExpanded(
            (current) =>
              !current
          )
        }
      >
        <span>
          {expanded
            ? 'Hide guided checks'
            : 'Run guided checks'}
        </span>

        <ChevronRight
          size={18}
          className={
            expanded
              ? 'open'
              : ''
          }
        />
      </button>


      {expanded && (
        <div className="offline-assistant-body">

          <div className="offline-checks">

            {guide.questions.map(
              (
                question,
                index
              ) => (
                <div
                  className="offline-question"
                  key={
                    question.id
                  }
                >

                  <div className="offline-question-title">

                    <span>
                      {index + 1}
                    </span>

                    <p>
                      {question.text}
                    </p>

                  </div>


                  <div className="offline-answer-row">

                    <AnswerButton
                      active={
                        answers[
                          question.id
                        ] === 'yes'
                      }
                      onClick={() =>
                        answer(
                          question.id,
                          'yes'
                        )
                      }
                    >
                      Yes
                    </AnswerButton>


                    <AnswerButton
                      active={
                        answers[
                          question.id
                        ] === 'no'
                      }
                      onClick={() =>
                        answer(
                          question.id,
                          'no'
                        )
                      }
                    >
                      No
                    </AnswerButton>


                    <AnswerButton
                      active={
                        answers[
                          question.id
                        ] ===
                        'unknown'
                      }
                      onClick={() =>
                        answer(
                          question.id,
                          'unknown'
                        )
                      }
                    >
                      Not sure
                    </AnswerButton>

                  </div>

                </div>
              )
            )}

          </div>


          <div className="offline-safety">

            <div className="offline-safety-title">

              <AlertTriangle
                size={17}
              />

              <b>
                Safety guidance
              </b>

            </div>


            <ol>
              {guide.safe.map(
                (
                  item,
                  index
                ) => (
                  <li
                    key={
                      item
                    }
                  >
                    <span>
                      {index + 1}
                    </span>

                    {item}
                  </li>
                )
              )}
            </ol>

          </div>


          <div
            className={
              'offline-recommendation ' +
              recommendation.level
            }
          >

            <ShieldCheck
              size={19}
            />

            <span>

              <b>
                {
                  recommendation.title
                }
              </b>

              <small>
                {
                  recommendation.text
                }
              </small>

            </span>

          </div>


          <div className="offline-progress">

            <span>
              {completed} /{' '}
              {
                guide.questions
                  .length
              }{' '}
              observations recorded
            </span>

            <div>
              <span
                style={{
                  width:
                    `${
                      Math.round(
                        (
                          completed /
                          guide
                            .questions
                            .length
                        ) *
                          100
                      )
                    }%`,
                }}
              />
            </div>

          </div>


          <p className="offline-disclaimer">
            This assistant provides precautionary guidance based on your answers. It does not diagnose vehicle faults or replace a qualified mechanic or emergency service.
          </p>

        </div>
      )}

    </section>
  )
}