import crypto from 'node:crypto'
import type { PayloadRequest } from "payload";
import { OAuth2Plugin } from "../src/index";

interface AppleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  id_token: string;
}

////////////////////////////////////////////////////////////////////////////////
// Apple OAuth
////////////////////////////////////////////////////////////////////////////////
export const appleOAuth = OAuth2Plugin({
  enabled:
    typeof process.env.APPLE_CLIENT_ID === "string" &&
    typeof process.env.APPLE_CLIENT_SECRET === "string",
  strategyName: "apple",
  useEmailAsIdentity: true,
  serverURL: process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
  clientId: process.env.APPLE_CLIENT_ID || "",
  clientSecret: process.env.APPLE_CLIENT_SECRET || "",
  authorizePath: "/oauth/apple",
  callbackPath: "/oauth/apple/callback",
  authCollection: "users",
  tokenEndpoint: "https://appleid.apple.com/auth/token",
  scopes: ["name", "email"],
  providerAuthorizationUrl: "https://appleid.apple.com/auth/authorize",
  // Required for Apple OAuth when requesting name or email scopes
  responseMode: "form_post",
  getUserInfo: async (accessToken: string, req: PayloadRequest) => {
    try {
      console.log('=== Apple OAuth Debug ===')
      console.log('Raw access token received:', accessToken)

      // For Apple, we need to decode the id_token which is a JWT
      // The token passed to this function is actually the full token response
      const tokenResponse = JSON.parse(accessToken) as AppleTokenResponse
      console.log('Parsed token response:', tokenResponse)

      if (!tokenResponse.id_token) {
        console.error('No id_token found in token response')
        throw new Error('No id_token found in token response')
      }

      const idToken = tokenResponse.id_token
      console.log('ID Token:', idToken)

      // Split the token and get the payload part (second part)
      const tokenParts = idToken.split('.')
      console.log('Token parts:', tokenParts)

      if (tokenParts.length !== 3) {
        throw new Error('Invalid ID token format')
      }

      // Decode the base64 payload
      const payloadBase64 = tokenParts[1]
      console.log('Base64 payload:', payloadBase64)

      const payloadString = Buffer.from(payloadBase64, 'base64').toString()
      console.log('Decoded payload string:', payloadString)

      const payload = JSON.parse(payloadString)
      console.log('Parsed payload:', payload)

      if (!payload.email) {
        console.error('No email found in payload')
        throw new Error('No email found in payload')
      }

      // Check if the user exists
      const existingUser = await req.payload.find({
        collection: 'users',
        where: {
          email: {
            equals: payload.email,
          },
        },
        limit: 1,
      })

      // If user doesn't exist, create a new one
      if (!existingUser.docs || existingUser.docs.length === 0) {
        console.log('Creating new user for:', payload.email)
        const randomPassword = crypto.randomBytes(32).toString('hex')

        const newUser = await req.payload.create({
          collection: 'users',
          data: {
            email: payload.email,
            firstName: payload.given_name || 'Apple',
            lastName: payload.family_name || 'User',
            name: payload.given_name && payload.family_name
              ? `${payload.given_name} ${payload.family_name}`
              : 'Apple User',
            password: randomPassword,
            roles: ['customer'],
          },
        })
        return {
          ...newUser,
          roles: ['customer'],
        }
      }

      console.log('Found existing user:', existingUser.docs[0])
      const userFromDB = existingUser.docs[0]
      return {
        email: payload.email,
        firstName: userFromDB.firstName,
        lastName: userFromDB.lastName,
        name: userFromDB.name,
        roles: userFromDB.roles || ['customer'],
      }
    } catch (error) {
      console.error('Detailed error in getUserInfo:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      throw error
    }
  },
  getToken: async (code: string, req: PayloadRequest) => {
    try {
      console.log('=== Apple OAuth Token Exchange Debug ===')
      console.log('Code received:', code)

      const redirectUri = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/users/oauth/apple/callback`
      console.log('Redirect URI:', redirectUri)

      // Make the token exchange request manually
      const params = new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID || '',
        client_secret: process.env.APPLE_CLIENT_SECRET || '',
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      })

      const response = await fetch('https://appleid.apple.com/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('Token exchange failed:', error)
        throw new Error(`Token exchange failed: ${error}`)
      }

      const tokenResponse = await response.json()
      console.log('Token response received:', tokenResponse)

      // Return the stringified token response
      return JSON.stringify(tokenResponse)
    } catch (error) {
      console.error('Error in getToken:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      throw error
    }
  },
  successRedirect: (req) => {
    // Check user roles to determine redirect
    const user = req.user
    if (user && Array.isArray(user.roles)) {
      if (user.roles.includes('admin')) {
        return '/admin'
      }
    }
    return '/' // Default redirect for customers
  },
  failureRedirect: (req, err) => {
    console.error('OAuth failure:', err)
    return '/login?error=apple-auth-failed'
  },
});
