// @flow

import _ from 'lodash'

const refType = Symbol('ref')
const firstType = Symbol('first')
const objectType = Symbol('object')

type CRefType = {
  type: Symbol,
  name: string,
  toString: ()=>string
}

type CFirstType = {
  type: Symbol,
  values: Array<any>,
  toString: ()=>string
}

export function ref(name: string): CRefType {
  console.assert(typeof name == 'string');
  return {
    type: refType,
    name: name,
    toString() {
      return varRefToString(this)
    }
  }
}

export function first(...values) {
  return {
    type: firstType,
    values: values,
    toString() {
      return varRefToString(this)
    }
  }
}

export function object(...propSets) {
  return {
    type: objectType,
    values: propSets,
    toString() {
      return varRefToString(this)
    }
  }
}


export function varRefToString(val_or_ref): string {
  if (isVarFirst(val_or_ref)) {
    const strs = _.map(val_or_ref.values, varRefToString).join(',')
    return `#first[${strs}]`
  }
  if (isVarObject(val_or_ref)) {
    return `#object{...}`
  }
  if (isVarRef(val_or_ref)) {
    return  `<${val_or_ref.name}>`
  }
  return `${val_or_ref}`
}

// export function varObjectSetting(theme, variables, varObj) {
//   if (isVarRef(varObj)) {
//     return varObjectSetting(theme, variables, variables[varObj.name])
//   }
//   if (isVarObject(varObj)) {
//     const allProps = _.map(varObj.propSets, (props)=> {
//       if (isVarRef()) {

//       }
//     })
//   }
//   return varObj
// }


export function isVarRef(val_or_ref: any): boolean {
  return val_or_ref && val_or_ref.type === refType
}

export function isVarFirst(val_or_ref: any): boolean {
  return val_or_ref && val_or_ref.type === firstType
}

export function isVarObject(val_or_ref: any): boolean {
  return val_or_ref && val_or_ref.type === objectType
}

function resolveValue(variables, val_or_ref) {
  if (isVarFirst(val_or_ref)) {
    const vfirst = val_or_ref
    val_or_ref = _.find(vfirst.values, (val)=>{
      return resolveValue(variables, val) !== undefined
    })
  }

  if (isVarObject(val_or_ref)) {
    // console.log('  isVarObject')
    const vobj = val_or_ref
    const propSets = _.map(vobj.values, (props)=>
      _.mapValues(resolveValue(variables, props),
        resolveValue.bind(null, variables)
      )
    )
    return _.defaults(...propSets);
  }

  if (isVarRef(val_or_ref)) {
    let context = variables;
    const paths = val_or_ref.name.split('.')
    let accpaths = [];
    let pathValue;
    let lastContextPathIndex = _.findIndex(paths, (path) => {
      accpaths = [...accpaths, path]
      pathValue = _.get(context, accpaths.join('.'))
      if (pathValue === undefined) { return; }
      if (isVarRef(pathValue) || isVarFirst(pathValue) || isVarObject(pathValue)) {
        context = resolveValue(variables, pathValue)
        accpaths = []
        pathValue = pathValue
      }
    });
    return resolveValue(variables, pathValue)
  }

  if (_.isObject(val_or_ref)) {
    return _.mapValues(val_or_ref, resolveValue.bind(null, variables))
  }
  return val_or_ref
}

export default function conflate(variables: any) {
  if (!_.isPlainObject(variables)) {
    throw new Error('variables must be an Object')
  }
  function conflateMap(key: string) {
    // console.log('conflateMap:', key)
    let val_or_ref = ref(key)
    return resolveValue(variables, val_or_ref);
  }

  return conflateMap
}
