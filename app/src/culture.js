/*!
 * Culture - Multi-Culture / Translation
 * Copyright(c) 2019-2020 Konrad Baechler, https://diva.exchange
 * GPL3 Licensed
 */

'use strict'

import dateFormat from 'dateformat'

import { Db } from './db'

export const CULTURE_DEFAULT_LANGUAGE_IDENT = 'en'

export class Culture {
  /**
   * @param request {object}
   * @returns {Culture}
   */
  static init (request) {
    Culture._make()
    Culture.uiLanguage = Culture.languageFromRequest(request)
    return Culture
  }

  /**
   * @param request {object}
   * @returns {string}
   * @public
   */
  static languageFromRequest (request) {
    let uiLanguage = (request.body && request.body.uiLanguage) || (request.query && request.query.uiLanguage) || ''
    if (!uiLanguage && request.session) {
      const session = request.session
      if (session.account && session.stateView && session.stateView[session.account] &&
        session.stateView[session.account].uiLanguage) {
        uiLanguage = session.stateView[session.account].uiLanguage
      } else {
        uiLanguage = session.uiLanguage
      }
    }

    return uiLanguage || request.acceptsLanguages(Culture.getListIdentLanguages()) || CULTURE_DEFAULT_LANGUAGE_IDENT
  }

  /**
   * Get list of available languages
   *
   * @returns {Array}
   * @public
   */
  static getListIdentLanguages () {
    Culture._make()
    return Culture._cacheIdentLanguages
  }

  /**
   * Reload the data in the cache from the database
   *
   * @returns {Culture}
   */
  static reload () {
    return Culture._make(true)
  }

  /**
   * Translate an ident
   *
   * @param ident {string} Identifier to translate
   * @param identLanguage {Array|string} Target languages to translate to
   * @returns {string}
   * @throws {Error}
   * @public
   */
  static translateString (ident, identLanguage = []) {
    if (typeof ident !== 'string') {
      throw new Error('invalid ident')
    }
    return Culture._translate([ident], identLanguage).values().next().value
  }

  /**
   * Alias for translateString
   */
  static t (ident, identLanguage) {
    return Culture.translateString(ident, identLanguage)
  }

  /**
   * Translate multiple idents
   *
   * @param ident {Array} Identifiers to translate
   * @param identLanguage {Array|string} Target languages to translate to
   * @returns {Map}
   * @throws {Error}
   * @public
   */
  static translateArray (ident, identLanguage = []) {
    if (!(ident instanceof Array)) {
      throw new Error('invalid ident')
    }
    return Culture._translate(ident, identLanguage)
  }

  /**
   * @param timestamp {number}
   * @param format {string}
   * @returns {string}
   */
  static formatDateTime (timestamp, format = '') {
    if (format !== '') {
      return dateFormat(timestamp, format)
    }
    switch (Culture.uiLanguage || CULTURE_DEFAULT_LANGUAGE_IDENT) {
      case 'de':
        return dateFormat(timestamp, 'dd.mm.yyyy HH:MM:ss.l o')
      case 'en':
      default:
        return dateFormat(timestamp, 'mm/dd/yyyy hh:MM:ss.l TT o')
    }
  }

  /**
   * @param ident {Array} Identifiers to translate
   * @param identLanguage {Array|string} Target languages to translate to
   * @returns {Map}
   * @throws {Error}
   * @private
   */
  static _translate (ident, identLanguage) {
    // unify
    ident = Array.from(new Set(ident))

    if (typeof identLanguage === 'string') {
      identLanguage = [identLanguage]
    } else if (!(identLanguage instanceof Array)) {
      throw new Error('invalid identLanguage')
    }
    identLanguage.push(Culture.uiLanguage, CULTURE_DEFAULT_LANGUAGE_IDENT)
    // remove duplicates and empty values
    identLanguage = Array.from(new Set(identLanguage)).filter(v => v)

    const _mapTranslation = new Map()
    ident.forEach((i) => {
      let translation = ''
      if (i.match(/^[0-9]+$/)) {
        translation = Culture.formatDateTime(parseInt(i))
      } else {
        const _iL = identLanguage.slice(0)
        while (_iL.length > 0 && !translation) {
          translation = Culture._cacheTranslation.get(_iL.shift() + ':' + i)
        }
      }
      _mapTranslation.set(String(i), translation || i)
    })

    return _mapTranslation
  }

  /**
   * @returns {Culture}
   * @private
   */
  static _make (force = false) {
    if (typeof Culture._db === 'undefined' || force) {
      Culture._db = Db.connect()

      Culture._cacheTranslation = new Map(
        Culture._db.allAsArray('SELECT * FROM culture').map(r => [r.language_ident + ':' + r.ident, r.text])
      )
      Culture._cacheIdentLanguages =
        Culture._db.allAsArray('SELECT language_ident FROM language').map(r => r.language_ident)
    }

    return Culture
  }
}

module.exports = { CULTURE_DEFAULT_LANGUAGE_IDENT, Culture }
