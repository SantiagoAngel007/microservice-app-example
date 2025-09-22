import Vue from 'vue'
import router from './router'
import store from './store'
import decode from 'jwt-decode'
import CircuitBreaker from './circuitBreaker'

const LOGIN_URL = window.location.protocol + '//' + window.location.host + '/login'
const ROLE_ADMIN = 'ADMIN'

// Circuit breaker for authentication calls
const authCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30000, // 30 seconds
  callTimeout: 5000    // 5 seconds
})

export default {
  install(Vue, options) {
    Vue.http.interceptors.push((request, next) => {
      const token = store.state.auth.accessToken
      const hasAuthHeader = request.headers.has('Authorization')

      if (token && !hasAuthHeader) {
        this.setAuthHeader(request)
      }
      next()
    })

    Vue.prototype.$auth = Vue.auth = this
  },

  async login(creds, redirect) {
    const params = {
      username: creds.username,
      password: creds.password
    }

    try {
      const response = await authCircuitBreaker.call(() =>
        Vue.http.post(LOGIN_URL, params)
      )

      this._storeToken(response)

      if (redirect) {
        router.push({ name: redirect })
      }

      return response
    } catch (error) {
      if (error.message === 'Circuit breaker is OPEN') {
        console.warn('Authentication service unavailable, using cached credentials')
        // Implement fallback logic if needed
        throw new Error('Authentication service temporarily unavailable')
      }
      throw error
    }
  },

  logout() {
    store.commit('CLEAR_ALL_DATA')
    router.push({ name: 'login' })
  },

  setAuthHeader(request) {
    request.headers.set('Authorization', 'Bearer ' + store.state.auth.accessToken)
  },

  isAdmin() {
    const user = store.state.user
    return user.role === ROLE_ADMIN
  },

  isLoggedIn() {
    const auth = store.state.auth
    return auth.isLoggedIn
  },

  _retry(request) {
    this.setAuthHeader(request)
    return Vue.http(request)
  },

  _storeToken(response) {
    const auth = store.state.auth
    auth.isLoggedIn = true
    auth.accessToken = response.body.accessToken

    const userData = decode(auth.accessToken)
    const user = store.state.user

    user.name = userData.name
    user.role = userData.role

    store.commit('UPDATE_AUTH', auth)
    store.commit('UPDATE_USER', user)
  }
}
