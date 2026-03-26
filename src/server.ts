// Polyfill all Web APIs for Node 16 — OpenAI SDK and other libs need these globals
import fetch, { Headers, Request, Response } from 'node-fetch'
import { FormData, File } from 'formdata-node'
import { ReadableStream, WritableStream, TransformStream } from 'web-streams-polyfill'
import { Blob } from 'buffer'

const g = globalThis as any
if (!g.fetch) g.fetch = fetch
if (!g.Headers) g.Headers = Headers
if (!g.Request) g.Request = Request
if (!g.Response) g.Response = Response
if (!g.FormData) g.FormData = FormData
if (!g.File) g.File = File
if (!g.Blob) g.Blob = Blob
if (!g.ReadableStream) g.ReadableStream = ReadableStream
if (!g.WritableStream) g.WritableStream = WritableStream
if (!g.TransformStream) g.TransformStream = TransformStream

import './app'
