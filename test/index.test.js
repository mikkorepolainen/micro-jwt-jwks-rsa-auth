/* eslint-env jest */
'use strict'

const jwtAuth = require('../index')
const VALID_HEADER = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IldhbHRlciBXaGl0ZSIsImFkbWluIjp0cnVlfQ.YyF_yOQsTSQghvM08WBp7VhsHRv-4Ir4eMQvsEycY1A'
const INVALID_HEADER = 'Bearer wrong.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IldhbHRlciBXaGl0ZSIsImFkbWluIjp0cnVlfQ.YyF_yOQsTSQghvM08WBp7VhsHRv-4Ir4eMQvsEycY1A'
const JWT_CONTENT = { sub: '1234567890', name: 'Walter White', admin: true }

test('Error thrown if configuration empty or undefined', async () => {
  expect(
    () => jwtAuth(undefined)()
  ).toThrow('micro-jwt-jwks-rsa-auth must be initialized passing either a public key from jwks (secret) or jwks-rsa configuration (jwksRsaConfig) configuration option to decode incoming JWT token')
  expect(
    () => jwtAuth({})()
  ).toThrow('micro-jwt-jwks-rsa-auth must be initialized passing either a public key from jwks (secret) or jwks-rsa configuration (jwksRsaConfig) configuration option to decode incoming JWT token')
})

test('Error thrown if no authorization header', async () => {
  const request = {
    headers: {},
    url: 'https://api.cabq.gov/domain/resources/1'
  }

  const response = {
    writeHead: jest.fn().mockImplementation(),
    end: jest.fn().mockImplementation()
  }

  let success = false
  try {
    await jwtAuth({ secret: 'mySecret' })()(request, response)
    success = true
  } catch (err) {
    expect(err.statusCode).toBe(401)
    expect(err.message).toBe('Missing Authorization header')
  }
  expect(success).toBe(false)
})

test('All works fine: no errors', async () => {
  const request = {
    headers: {
      authorization: VALID_HEADER
    },
    url: 'https://api.cabq.gov/domain/resources/1'
  }

  const response = {
    writeHead: jest.fn().mockImplementation(),
    end: jest.fn().mockImplementation()
  }

  const result = await jwtAuth({ secret: 'mySecret' })(() => 'Good job!')(request, response)

  expect(request.jwt).toEqual(JWT_CONTENT)
  expect(result).toEqual('Good job!')
  expect(response.writeHead).toHaveBeenCalledTimes(0)
  expect(response.end).toHaveBeenCalledTimes(0)
})

test('Wrong bearer case', async () => {
  const request = {
    headers: {
      authorization: INVALID_HEADER
    },
    url: 'https://api.cabq.gov/domain/resources/1'
  }

  const response = {
    writeHead: jest.fn().mockImplementation(),
    end: jest.fn().mockImplementation()
  }

  let success = false
  try {
    await jwtAuth({ secret: 'mySecret' })(() => {})(request, response)
    success = true
  } catch (err) {
    expect(err.statusCode).toBe(401)
    expect(err.message).toBe('Invalid token in Authorization header')
  }
  expect(success).toBe(false)
})

test('No need for bearer token if whitelisted path', async () => {
  const request = {
    headers: {},
    url: 'https://api.cabq.gov/domain/resources/1'
  }

  const response = {
    writeHead: jest.fn().mockImplementation(),
    end: jest.fn().mockImplementation()
  }

  const result = await jwtAuth({ secret: 'mySecret', whitelist: [ '/domain/resources/1' ] })(() => 'Good job!')(request, response)

  expect(result).toEqual('Good job!')
  expect(response.writeHead).toHaveBeenCalledTimes(0)
  expect(response.end).toHaveBeenCalledTimes(0)
})

test('Decode jwt even for whitelisted path', async () => {
  const request = {
    headers: {
      authorization: VALID_HEADER
    },
    url: 'https://api.cabq.gov/domain/resources/1'
  }

  const response = {
    writeHead: jest.fn().mockImplementation(),
    end: jest.fn().mockImplementation()
  }

  const result = await jwtAuth({ secret: 'mySecret', whitelist: [ '/domain/resources/1' ] })(() => 'Good job!')(request, response)

  expect(result).toEqual('Good job!')
  expect(response.writeHead).toHaveBeenCalledTimes(0)
  expect(response.end).toHaveBeenCalledTimes(0)
  expect(request.jwt).toEqual(JWT_CONTENT)
})

test('No error if jwt is invalid for whitelisted path', async () => {
  const request = {
    headers: {
      authorization: INVALID_HEADER
    },
    url: 'https://api.cabq.gov/domain/resources/1'
  }

  const response = {
    writeHead: jest.fn().mockImplementation(),
    end: jest.fn().mockImplementation()
  }

  const result = await jwtAuth({ secret: 'mySecret', whitelist: [ '/domain/resources/1' ] })(() => 'Good job!')(request, response)

  expect(result).toEqual('Good job!')
  expect(response.writeHead).toHaveBeenCalledTimes(0)
  expect(response.end).toHaveBeenCalledTimes(0)
  expect(request.jwt).toBeUndefined()
})

test('Custom response, wrong token', async () => {
  const request = {
    headers: {
      authorization: INVALID_HEADER
    },
    url: 'https://api.cabq.gov/domain/resources/1'
  }

  const response = {
    writeHead: jest.fn().mockImplementation(),
    end: jest.fn().mockImplementation()
  }

  const customRes = `${Math.random()}`
  let success = false
  try {
    await jwtAuth({ secret: 'mySecret', resAuthInvalid: customRes })(() => {})(request, response)
    success = true
  } catch (err) {
    expect(err.statusCode).toBe(401)
    expect(err.message).toBe(customRes)
  }
  expect(success).toBe(false)
})

test('Custom response, missing token', async () => {
  const request = {
    headers: {},
    url: 'https://api.cabq.gov/domain/resources/1'
  }

  const response = {
    writeHead: jest.fn().mockImplementation(),
    end: jest.fn().mockImplementation()
  }

  const customRes = `${Math.random()}`
  let success = false
  try {
    await jwtAuth({ secret: 'mySecret', resAuthMissing: customRes })(() => {})(request, response)
    success = true
  } catch (err) {
    expect(err.statusCode).toBe(401)
    expect(err.message).toBe(customRes)
  }
  expect(success).toBe(false)
})
