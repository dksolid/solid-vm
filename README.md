## Library for connecting Solid.js View Models to components

[![npm](https://img.shields.io/npm/v/@dksolid/solid-vm)](https://www.npmjs.com/package/@dksolid/solid-vm)
![coverage](https://github.com/dksolid/solid-vm/blob/main/assets/coverage.svg)
![size-esm](https://github.com/dksolid/solid-vm/blob/main/assets/esm.svg)
![size-cjs](https://github.com/dksolid/solid-vm/blob/main/assets/cjs.svg)

The purpose of this library is to allow local Solid.js View Models (VM) be attached to components.

The logic in FC components may become bloated, so it's much more comfortable to write it in
class stores. This gives you a great structure, clean code and powerful reactive performance.

This library:
- allows to inject 1 or more Context dependencies inside VM
- may be used in different modes (without arguments or with VM, props)
- has a comprehensive lifecycle similar to React Class Components (beforeMount, afterMount, beforeUnmount)


#### Contents

- [Installation](#installation)
- [Usage: modes](#usage-modes)
  - [Without arguments (just context)](#without-arguments-just-context)
  - [With VM](#with-vm)
  - [With VM & props](#with-vm--props)
  - [With several contexts](#with-several-contexts)
- [Usage: Lifecycle](#usage-lifecycle)
  - [Inside VM](#inside-vm)
  - [Global](#global)

### Installation

Add `@dksolid/solid-vm` to package.json and install.

### Usage: modes

#### Without arguments (just context)

```typescript
import { createUseStore } from '@dksolid/solid-vm';
import { createContext } from 'solid-js';

const StoreContext = createContext(undefined); // any context

const useStore = createUseStore(StoreContext);

function TopWrapper() {
  return (
    <StoreContext.Provider value={{ ui: {}, user: {}, api: {} }}>
      <App />
    </StoreContext.Provider>
  );
}

function App() => {
  const { context } = useStore();

  return (
    <>
      <div>{context.user.name}</div>
    </>
  );
}
```

This is a minimal example. `StoreContext` may be any (`undefined | null | object | observable | function | array`), but
it is required as a first argument for `createUseStore`. You can construct several different `useStore`
if you use some feature-sliced, domain, atomic or other architecture.

```typescript
const ContextGlobal = createContext({ ui: {}, user: {}, api: {} });
const useStoreGlobal = createUseStore(ContextGlobal);

const ContextWidget = createContext(['123']);
const useStoreWidget = createUseStore(ContextWidget);

const ContextPageModule = React.createContext({ pageName: 'users' });
const useStorePageModule = createUseStore(ContextPageModule);
```

and use them accordingly. By design **only one** context may be attached.

But there will be a workaround in other sections of the docs if you need this feature.

#### With VM

```typescript
import { ViewModelConstructor } from '@dksolid/solid-vm';
import { createMutable } from 'solid-js/store';

... attach context and create useStore hook

type ViewModel = ViewModelConstructor<ContextType<typeof StoreContext>>;

class VM implements ViewModel {
  constructor(public context: ContextType<typeof StoreContext>) {
    return createMutable(this);
  }
  
  get dataFromContext() {
    return this.context.user.name;
  }
}

function App() => {
  const { context, vm } = useStore(VM);

  return (
    <>
      <div>{vm.dataFromContext}</div>
      <div>{context.user.name}</div>
    </>
  );
}
```

#### With VM & props

```typescript
type PropsApp = {
  data: string;
}

class VM implements ViewModel {
  localParam = 'string';

  constructor(public context: ContextType<typeof StoreContext>, public props: PropsApp) {
    return createMutable(this);
  }
  
  get dataFromContext() {
    return this.context.user.name;
  }
  
  get dataFromProps() {
    return this.props.data;
  }
  
  get mixData() {
    return this.dataFromProps + this.dataFromContext + this.localParam;
  }
}

function App(props: PropsApp) => {
  const { vm } = useStore(VM, props);

  return (
    <>
      <div>{vm.dataFromContext}</div>
      <div>{vm.dataFromProps}</div>
      <div>{vm.localParam}</div>
      <div>{vm.mixData}</div>
    </>
  );
}
```

Here is an example how to connect 3 types of data. On is passed by Context, the second is passed
by `props` and the last is a part of VM (`localParam`).

#### With several contexts

```typescript
const StoreContext = createContext({ data: 1 });
const StoreContext2 = createContext({ data: 2 });

const useStore = createUseStore(StoreContext);

type ViewModel = ViewModelConstructor<ContextType<typeof StoreContext>>;

type PropsApp = {
  data: string;
}

class VM implements ViewModel {
  constructor(
    public context: ContextType<typeof StoreContext>, 
    public props: PropsApp & { context2: ContextType<typeof StoreContext2> }
   ) {
    return createMutable(this);
  }
  
  get computedFromTwoContexts() {
    return this.context.data + this.props.context2.data;
  }
}

function App(props: PropsApp) => {
  const context2 = useContext(StoreContext2);
        
  const { vm } = useStore(VM, { ...props, context2 });

  return vm.computedFromTwoContexts; // 3
});
```

This way you can use `@dksolid/solid-vm` as a Dependency Injection (DI) system that works over
Solid.js Context. This is fully supported by Server-Side Rendering (SSR).

### Usage: Lifecycle

#### Inside VM

```typescript
... attach context and create useStore hook

class VM implements ViewModel {
  constructor(public context: ContextType<typeof StoreContext>) {
    return createMutable(this);
  }
  
  beforeMount() {
    // this function is invoked both during SSR & Client rendering
    // React class-component equivalent: componentWillMount
  }

  afterMount() {
    // this function is invoked during Client rendering only
    // React class-component equivalent: componentDidMount
  }

  beforeUnmount() {
    // this function is invoked during Client rendering only
    // React class-component equivalent: componentWillUnmount
  }
}

function App() => {
  const { vm } = useStore(VM);

  return null;
});
```

Be aware that during SSR only `beforeMount` is invoked. So start your isomorphic logic like
api-requests here.

#### Global

```typescript
const useStore = createUseStore(StoreContext, {
  beforeMount(context, vm?) {},
  afterMount(context, vm?) {},
  beforeUnmount(context, vm?) {},
});

class VM implements ViewModel {
  constructor(public context: ContextType<typeof StoreContext>) {
    return createMutable(this);
  }
}

function App() => {
  const { vm } = useStore(VM);
  
  // useStore(); if you call without VM argument then "vm" in global lifecycle will be empty

  return null;
});
```

Global lifecycle methods defined in the second argument of `createUseStore` are invoked for every
component that uses `useStore`, and **before local lifecycle methods defined in VM**. The most
obvious purpose of using them is logging (ex. add param `name = 'VM_for_Select'` to VM and log it
in global lifecycle to know which component has been mounted / unmounted).
