import { describe, expect, it } from 'vitest'
import { alreadyPosition } from './already'

describe('un libro ya empezado', () => {
  it('vale cualquier sitio dentro del libro, sin llegar al final', () => {
    expect(alreadyPosition({ position: '0', startedOn: '' }, 300)).toBe(0)
    expect(alreadyPosition({ position: '150', startedOn: '' }, 300)).toBe(150)
    expect(alreadyPosition({ position: '299', startedOn: '' }, 300)).toBe(299)
  })
  it('vacío, al final o fuera del libro no vale', () => {
    expect(alreadyPosition({ position: '', startedOn: '' }, 300)).toBeNull()
    expect(alreadyPosition({ position: '300', startedOn: '' }, 300)).toBeNull()
    expect(alreadyPosition({ position: '35', startedOn: '' }, 0)).toBeNull()
  })
})
