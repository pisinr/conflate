// import expect from 'expect'

import conflate from './index'
import {
  ref, isVarRef,
  first, isVarFirst,
  object, isVarObject,
  varRefToString,
} from './index'

describe('ref', () => {
  it('create a `ref` instance', () => {
    expect(ref('a')).toBeDefined()
  })
  it('can be checked if it is a `ref` instance', () => {
    expect(isVarRef(ref('a'))).toBe(true)
  })
  it('can be printed as string', () => {
    expect(`${ref('test')}`).toEqual('<test>')
  })
})

describe('first', () => {
  it('create a `first` instance from list', () => {
    expect(first('a', 'b')).toBeDefined()
  })
  it('can be checked if it is a `first` instance', () => {
    expect(isVarFirst(first('a', 'b'))).toBe(true)
  })
  it('can be printed as string', () => {
    expect(`${first('a', ref('r'))}`).toEqual('#first[a,<r>]')
  })
})

describe('varRefToString', () => {
  it('can convert `ref` instance to string', () => {
    expect(varRefToString(ref('a'))).toEqual('<a>')
  })
  it('can convert `first` instance to string', () => {
    expect(varRefToString(first('a', ref('r')))).toEqual('#first[a,<r>]')
  })
  it('can convert `object` instance to string', () => {
    expect(varRefToString(object({a: 1}))).toEqual('#object{...}')
  })
  it('can convert other values to string', () => {
    expect(varRefToString(1)).toEqual('1')
    expect(varRefToString([1,2])).toEqual('1,2')

  })
})

describe('instance type checking', () => {
  it('can identify type of `var` obj', () => {
    const vref = ref('x')
    const vfirst = first('x')
    const vobj = object({a: 1})
    expect(isVarRef(vref) && !isVarFirst(vref) && !isVarObject(vref)).toBe(true)
    expect(!isVarRef(vfirst) && isVarFirst(vfirst) && !isVarObject(vfirst)).toBe(true)
    expect(!isVarRef(vobj) && !isVarFirst(vobj) && isVarObject(vobj)).toBe(true)
    expect(!isVarRef(null) && !isVarFirst(null) && !isVarObject(null)).toBe(true)
    expect(!isVarRef('') && !isVarFirst('') && !isVarObject('')).toBe(true)
    expect(!isVarRef({}) && !isVarFirst({}) && !isVarObject({})).toBe(true)
  })
})

describe('conflate', () => {
  // main test case data
  let variables = {
    'color.primary': 'blue',
    'color.secondary': 'red',
    'color.accent': ref('color.secondary'),
    'color.highlight': ref('color.accent'),
    'color.wow': ref('color.highlight'),

    ref: {
      nested: {
        value: 'v',
        ref: ref('color.primary'),
      },
    },

    'ref-first': ref('first-undefined'),
    'ref-object': ref('object-plain'),
    'ref-nested': ref('ref.nested.value'),

    'first-undefined': first(undefined, 1),
    'first-null': first(null, 1),
    'first-thing': first('thing', 1),
    'first-object': first(undefined, object({a: 1, b: 2})),

    'first-unknown': first(ref('unknown'), 1),
    'first-primary': first(undefined, ref('color.primary')),
    'first-secondary': first(ref('unknown'), ref('color.secondary')),
    'first-wow': first(undefined, ref('color.wow')),

    'object-plain': object({a: 1, b: 2}),
    'object-plain-list-1': object({a: 1, b: 2}, {c: 3, a: 4}),
    'object-plain-list-2': object(null, {a: 1, b: 2}, null, {c: 3, a: 4}),

    'object-ref-keys': object(
      {
        a: ref('color.primary')
      }, {
        b: ref('color.secondary'),
        c: ref('first-wow')
      }
    ),

    'object-first-keys': object(
      {
        a: first(1, 2)
      }, {
        b: first(ref('unknown'), ref('first-thing')),
      }
    ),

    'object-complex-1': object({a: 0}, ref('object-plain-list-1'), {d: 4}),
    'object-complex-2': object({a: 0}, ref('unknow'), object({a: 1, b: 2, c: ref('color.wow')})),
    'object.dotted': object({a: 0, b: ref('object-complex-1') }),

    nested: {
      object: {
        path: ref('object.dotted')
      }
    }
  }

  describe('argument validation', () => {
    it('should throw on non-object variables', () => {
      expect(() => conflate(1)).toThrow()
      expect(() => conflate(null)).toThrow()
    })
  })

  it('should return function for lookup', () => {
    expect(conflate({})).toBeInstanceOf(Function)
  })

  it('should give undefined from empty valriables', () => {
    expect(conflate({})('a')).toBe(undefined)
  })

  describe('create lookup function from simple variables map', () => {
    let variables = {
      'color.primary': 'blue',
      'color.secondary': 'red',
      color: {
        nested: {
          lookup: 'val'
        }
      }
    }
    let maps;

    beforeAll(()=>{
      maps = conflate(variables)
    })
    it('can lookup by key', ()=> {
      expect(maps('color.primary')).toEqual('blue')
      expect(maps('color.secondary')).toEqual('red')
    })
    it('can lookup into nested path', ()=> {
      expect(maps('color.nested.lookup')).toEqual('val')
    })
    it('can lookup into nested path of nested refs', ()=> {
      expect(maps('color.nested.lookup')).toEqual('val')
    })
    it('returns `undefined` for invalid keys', ()=> {
      expect(maps('a')).toBeUndefined()
    })
  })

  describe('simple map conflates', () => {
    let variables = {
      'color.primary': 'blue',
      'color.secondary': 'red',
      'obj': {a: 1, b: 2},
    }
    let maps;

    beforeAll(()=>{
      maps = conflate(variables)
    })
    it('can lookup by key', ()=> {
      expect(maps('color.primary')).toEqual('blue')
      expect(maps('color.secondary')).toEqual('red')
      expect(maps('obj')).toEqual({a: 1, b: 2})
    })
    it('returns `undefined` for invalid keys', ()=> {
      expect(maps('a')).toBeUndefined()
    })
  })

  describe('conflate with `ref`', () => {
    let maps;

    beforeAll(()=>{
      maps = conflate(variables)
    })
    it('can follow ref to the target value', ()=> {
      expect(maps('color.accent')).toEqual('red')
      expect(maps('ref-nested')).toEqual('v')
    })
    it('can follow ref inside nested path', ()=> {
      expect(maps('ref.nested.ref')).toEqual('blue')
    })
    it('return `undefined` on unknow key', ()=> {
      expect(maps('color.none')).toBeUndefined()
    })
    it('can follow ref of ref(s)', ()=> {
      expect(maps('color.highlight')).toEqual('red')
      expect(maps('color.wow')).toEqual('red')
    })
    it('can refer to `first` or `object`', ()=> {
      expect(maps('ref-first')).toEqual(1)
      expect(maps('ref-object')).toEqual({a: 1, b: 2})
    })
  })

  describe('conflate with `first`', () => {
    let maps;

    beforeAll(()=>{
      maps = conflate(variables)
    })
    it('can get the first defined value', ()=> {
      expect(maps('first-undefined')).toBe(1)
      expect(maps('first-null')).toBe(null)
      expect(maps('first-thing')).toEqual('thing')

    })
    it('supports `ref` in the list', ()=> {
      expect(maps('first-unknown')).toEqual(1)

      expect(maps('first-primary')).toEqual('blue')
      expect(maps('first-secondary')).toEqual('red')
      expect(maps('first-wow')).toEqual('red')
    })
    it('support `object` in the list', ()=> {
      expect(maps('first-object')).toEqual({
        a: 1, b: 2
      })
    })
  })

  describe('conflate with `obj`', () => {
    let maps;

    beforeAll(()=>{
      maps = conflate(variables)
    })
    it('can get plain object for simple case', ()=> {
      expect(maps('object-plain')).toEqual({a: 1, b: 2})
    })
    it('can merge first found attributes of list of objects', ()=> {
      expect(maps('object-plain-list-1')).toEqual({a: 1, b: 2, c: 3})
      expect(maps('object-plain-list-2')).toEqual({a: 1, b: 2, c: 3})
    })
    it('supports `ref` in the props', ()=> {
      expect(maps('object-ref-keys')).toEqual({
        a: 'blue',
        b: 'red',
        c: 'red'
      })
    })
    it('supports `first` in the props', ()=> {
      expect(maps('object-first-keys')).toEqual({
        a: 1,
        b: 'thing',
      })
    })
    it('can follow nested path with ref in between', ()=> {
      expect(maps('nested.object.path.b.c')).toEqual(3)
    })
    it('supports complex combinations', ()=> {
      expect(maps('object-complex-1')).toEqual({
        a: 0, b: 2, c: 3, d: 4
      })
      expect(maps('object-complex-2')).toEqual({
        a: 0, b: 2, c: 'red'
      })
    })
  })
})
