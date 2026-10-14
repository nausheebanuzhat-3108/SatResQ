import express from 'express'
import { fileURLToPath } from 'node:url'

import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
} from 'node:fs'

import { resolve } from 'node:path'

import {
  decode,
  encode,
  triage,
  stages,
} from './shared/core.js'


export function makeServer(directory) {
  mkdirSync(directory, {
    recursive: true,
  })

  const file = resolve(
    directory,
    'requests.json'
  )

  const mediaDirectory = resolve(
    directory,
    'media'
  )

  mkdirSync(mediaDirectory, {
    recursive: true,
  })


  let records =
    existsSync(file)
      ? JSON.parse(
          readFileSync(
            file,
            'utf8'
          )
        )
      : []


  if (!Array.isArray(records)) {
    throw new Error(
      'Invalid database; restore its backup.'
    )
  }


  for (const record of records) {
    decode(record.packet)

    if (
      !stages.includes(
        record.stage
      )
    ) {
      throw new Error(
        'Invalid saved record'
      )
    }
  }


  const persist = (next) => {
    writeFileSync(
      file + '.tmp',
      JSON.stringify(
        next,
        null,
        2
      )
    )

    renameSync(
      file + '.tmp',
      file
    )

    records = next
  }


  function safeId(id) {
    return (
      typeof id === 'string' &&
      /^[a-zA-Z0-9-]{8,64}$/.test(id)
    )
  }


  function mediaFile(id) {
    if (!safeId(id)) {
      throw new Error(
        'Invalid request ID'
      )
    }

    return resolve(
      mediaDirectory,
      `${id}.json`
    )
  }


  function readMedia(id) {
    try {
      const path =
        mediaFile(id)

      if (!existsSync(path)) {
        return {
          photo: null,
          voice: null,
        }
      }

      const value =
        JSON.parse(
          readFileSync(
            path,
            'utf8'
          )
        )

      return {
        photo:
          value?.photo || null,

        voice:
          value?.voice || null,
      }
    } catch {
      return {
        photo: null,
        voice: null,
      }
    }
  }


  function mediaSummary(id) {
    const media =
      readMedia(id)

    return {
      photo: !!media.photo,
      voice: !!media.voice,
    }
  }


  function cleanPhoto(value) {
    if (value === null) {
      return null
    }

    if (
      !value ||
      typeof value !== 'object' ||
      typeof value.dataUrl !==
        'string' ||
      !value.dataUrl.startsWith(
        'data:image/'
      )
    ) {
      throw new Error(
        'Invalid photo attachment'
      )
    }


    /*
     * The browser compresses the photo before
     * upload. This limit protects the demo server.
     */
    if (
      value.dataUrl.length >
      1_800_000
    ) {
      const error =
        new Error(
          'Photo attachment is too large'
        )

      error.status = 413
      throw error
    }


    return {
      dataUrl:
        value.dataUrl,

      name:
        typeof value.name ===
        'string'
          ? value.name.slice(
              0,
              120
            )
          : 'Breakdown photo',

      type:
        typeof value.type ===
        'string'
          ? value.type.slice(
              0,
              80
            )
          : 'image/jpeg',

      size:
        Number.isFinite(
          value.size
        )
          ? Math.max(
              0,
              Math.round(
                value.size
              )
            )
          : 0,

      capturedAt:
        typeof value.capturedAt ===
        'string'
          ? value.capturedAt
          : new Date()
              .toISOString(),
    }
  }


  function cleanVoice(value) {
    if (value === null) {
      return null
    }

    if (
      !value ||
      typeof value !== 'object' ||
      typeof value.dataUrl !==
        'string' ||
      !value.dataUrl.startsWith(
        'data:audio/'
      )
    ) {
      throw new Error(
        'Invalid voice attachment'
      )
    }


    /*
     * 20-second voice notes are deliberately
     * kept small by the traveller app.
     */
    if (
      value.dataUrl.length >
      1_100_000
    ) {
      const error =
        new Error(
          'Voice attachment is too large'
        )

      error.status = 413
      throw error
    }


    return {
      dataUrl:
        value.dataUrl,

      type:
        typeof value.type ===
        'string'
          ? value.type.slice(
              0,
              80
            )
          : 'audio/webm',

      size:
        Number.isFinite(
          value.size
        )
          ? Math.max(
              0,
              Math.round(
                value.size
              )
            )
          : 0,

      duration:
        Number.isFinite(
          value.duration
        )
          ? Math.max(
              0,
              Math.round(
                value.duration
              )
            )
          : 0,

      capturedAt:
        typeof value.capturedAt ===
        'string'
          ? value.capturedAt
          : new Date()
              .toISOString(),
    }
  }


  function persistMedia(
    id,
    media
  ) {
    const path =
      mediaFile(id)

    writeFileSync(
      path + '.tmp',
      JSON.stringify(
        media,
        null,
        2
      )
    )

    renameSync(
      path + '.tmp',
      path
    )
  }


  const app =
    express()


  app.disable(
    'x-powered-by'
  )


  /*
   * LOCAL DEMO ORIGIN PROTECTION
   */
  app.use(
    '/api',
    (
      req,
      res,
      next
    ) => {
      res.set(
        'Cache-Control',
        'no-store'
      )

      const origin =
        req.get(
          'origin'
        )

      if (
        origin &&
        !/^http:\/\/localhost:(4173|5173)$/.test(
          origin
        )
      ) {
        return res
          .status(403)
          .json({
            error:
              'Local demo origin only',
          })
      }

      next()
    }
  )


  /*
   * Rich media gets its own larger body limit.
   *
   * The critical emergency packet below keeps
   * the original 8 KB limit.
   */
  app.use(
    '/api/requests/:id/media',
    express.json({
      limit: '3mb',
    })
  )


  app.use(
    express.json({
      limit: '8kb',
    })
  )


  /*
   * HEALTH CHECK
   */
  app.get(
    '/api/health',
    (
      req,
      res
    ) => {
      res.json({
        ok: true,
        count:
          records.length,
      })
    }
  )


  /*
   * RESPONDER REQUEST LIST
   *
   * We only include whether media exists.
   * The actual photo/audio is fetched separately.
   */
  app.get(
    '/api/requests',
    (
      req,
      res
    ) => {
      const result =
        [...records]
          .sort(
            (
              a,
              b
            ) =>
              a.triage.rank -
                b.triage.rank ||
              b.receivedAt.localeCompare(
                a.receivedAt
              )
          )
          .map(
            (record) => ({
              ...record,

              media:
                mediaSummary(
                  record.id
                ),
            })
          )

      res.json(result)
    }
  )


  /*
   * CRITICAL EMERGENCY PACKET
   */
  app.post(
    '/api/requests',
    (
      req,
      res
    ) => {
      let report

      try {
        report =
          decode(
            req.body
          )
      } catch (error) {
        return res
          .status(400)
          .json({
            error:
              error.message,
          })
      }


      const packet =
        encode(report)


      const existing =
        records.find(
          (record) =>
            record.id ===
            report.id
        )


      if (existing) {
        if (
          JSON.stringify(
            existing.packet
          ) !==
          JSON.stringify(
            packet
          )
        ) {
          return res
            .status(409)
            .json({
              error:
                'ID already used for different contents',
            })
        }


        return res.json({
          acknowledged:
            true,

          duplicate:
            true,

          request: {
            ...existing,

            media:
              mediaSummary(
                existing.id
              ),
          },
        })
      }


      const now =
        new Date()
          .toISOString()


      const item = {
        ...report,

        packet,

        triage:
          triage(
            report
          ),

        stage:
          'Received',

        receivedAt:
          now,

        updatedAt:
          now,

        events: [
          {
            at: now,

            text:
              'Compact packet received and stored',
          },
        ],
      }


      try {
        persist([
          ...records,
          item,
        ])
      } catch {
        return res
          .status(500)
          .json({
            error:
              'Storage failed; receipt unconfirmed',
          })
      }


      res
        .status(201)
        .json({
          acknowledged:
            true,

          duplicate:
            false,

          request: {
            ...item,

            media: {
              photo: false,
              voice: false,
            },
          },
        })
    }
  )


  /*
   * RICH MEDIA UPLOAD
   *
   * Photo + voice are linked to the same
   * roadside request ID but kept outside the
   * compact emergency packet.
   */
  app.post(
    '/api/requests/:id/media',
    (
      req,
      res
    ) => {
      const request =
        records.find(
          (record) =>
            record.id ===
            req.params.id
        )


      if (!request) {
        return res
          .status(404)
          .json({
            error:
              'Send the emergency request before uploading media',
          })
      }


      try {
        const current =
          readMedia(
            request.id
          )


        const hasPhoto =
          Object.prototype.hasOwnProperty.call(
            req.body || {},
            'photo'
          )


        const hasVoice =
          Object.prototype.hasOwnProperty.call(
            req.body || {},
            'voice'
          )


        if (
          !hasPhoto &&
          !hasVoice
        ) {
          return res
            .status(400)
            .json({
              error:
                'No media supplied',
            })
        }


        const next = {
          photo:
            hasPhoto
              ? cleanPhoto(
                  req.body.photo
                )
              : current.photo,

          voice:
            hasVoice
              ? cleanVoice(
                  req.body.voice
                )
              : current.voice,
        }


        persistMedia(
          request.id,
          next
        )


        res.json({
          acknowledged:
            true,

          requestId:
            request.id,

          media: {
            photo:
              !!next.photo,

            voice:
              !!next.voice,
          },
        })
      } catch (error) {
        res
          .status(
            error.status ||
              400
          )
          .json({
            error:
              error.message ||
              'Media upload failed',
          })
      }
    }
  )


  /*
   * RESPONDER FETCHES RICH MEDIA
   */
  app.get(
    '/api/requests/:id/media',
    (
      req,
      res
    ) => {
      const request =
        records.find(
          (record) =>
            record.id ===
            req.params.id
        )


      if (!request) {
        return res
          .status(404)
          .json({
            error:
              'Request not found',
          })
      }


      const media =
        readMedia(
          request.id
        )


      res.json({
        requestId:
          request.id,

        photo:
          media.photo,

        voice:
          media.voice,
      })
    }
  )


  /*
   * RESPONDER STATUS UPDATE
   */
  app.patch(
    '/api/requests/:id',
    (
      req,
      res
    ) => {
      const item =
        records.find(
          (record) =>
            record.id ===
            req.params.id
        )


      if (!item) {
        return res
          .status(404)
          .json({
            error:
              'Request not found',
          })
      }


      const desired =
        req.body?.stage


      if (
        desired ===
        item.stage
      ) {
        return res.json({
          ...item,

          media:
            mediaSummary(
              item.id
            ),
        })
      }


      if (
        stages.indexOf(
          desired
        ) !==
        stages.indexOf(
          item.stage
        ) +
          1
      ) {
        return res
          .status(409)
          .json({
            error:
              'Status must advance one step',
          })
      }


      const now =
        new Date()
          .toISOString()


      const changed = {
        ...item,

        stage:
          desired,

        updatedAt:
          now,

        events: [
          ...item.events,

          {
            at: now,

            text:
              'Demo operator changed status to ' +
              desired,
          },
        ],
      }


      try {
        persist(
          records.map(
            (record) =>
              record.id ===
              item.id
                ? changed
                : record
          )
        )
      } catch {
        return res
          .status(500)
          .json({
            error:
              'Could not save status',
          })
      }


      res.json({
        ...changed,

        media:
          mediaSummary(
            changed.id
          ),
      })
    }
  )


  app.use(
    '/api',
    (
      req,
      res
    ) =>
      res
        .status(404)
        .json({
          error:
            'Unknown API route',
        })
  )


  /*
   * REACT BUILD
   */
  app.use(
    express.static(
      fileURLToPath(
        new URL(
          './dist',
          import.meta.url
        )
      ),
      {
        setHeaders: (
          res,
          path
        ) => {
          if (
            path.endsWith(
              'sw.js'
            ) ||
            path.endsWith(
              'index.html'
            )
          ) {
            res.set(
              'Cache-Control',
              'no-cache'
            )
          }
        },
      }
    )
  )


  app.use(
    (
      error,
      req,
      res,
      next
    ) => {
      res
        .status(
          error.status === 413
            ? 413
            : 500
        )
        .json({
          error:
            error.status === 413
              ? 'Attachment too large'
              : 'Server error; receipt unconfirmed',
        })
    }
  )


  return app
}


if (
  process.argv[1] &&
  resolve(
    process.argv[1]
  ) ===
    fileURLToPath(
      import.meta.url
    )
) {
  const app =
    makeServer(
      fileURLToPath(
        new URL(
          './server-data',
          import.meta.url
        )
      )
    )


  app
    .listen(
      4173,
      'localhost',
      () => {
        console.log(
          '\nSatResQ Pro: http://localhost:4173'
        )

        console.log(
          'Responder: http://localhost:4173/#dispatch'
        )

        console.log(
          'Rich media endpoint ready.'
        )

        console.log(
          'Local demo only. Press Ctrl+C to stop.\n'
        )
      }
    )
    .on(
      'error',
      (error) => {
        console.error(
          error.code ===
            'EADDRINUSE'
            ? 'Port 4173 is busy. Stop your old preview server with Ctrl+C.'
            : error.message
        )

        process.exit(1)
      }
    )
}