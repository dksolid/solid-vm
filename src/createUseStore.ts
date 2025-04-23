/* eslint-disable @typescript-eslint/naming-convention */
import { Context, onCleanup, onMount, useContext } from 'solid-js';

import { ViewModelConstructor } from './types/ViewModelConstructor.js';

type TypeOptions = {
  readonly include?: ReadonlyArray<string | RegExp>;
  readonly exclude?: ReadonlyArray<string | RegExp>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAllProperties = (object: Record<string, any>) => {
  const properties = new Set();

  do {
    for (const key of Reflect.ownKeys(object)) {
      properties.add([object, key]);
    }
    // @ts-ignore
    // eslint-disable-next-line no-cond-assign,no-param-reassign
  } while ((object = Reflect.getPrototypeOf(object)) && object !== Object.prototype);

  return properties;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function autoBind<TSelf extends Record<string, any>>(
  self: TSelf,
  options: TypeOptions = {}
): TSelf {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter = (key: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match = (pattern: any) => {
      return typeof pattern === 'string' ? key === pattern : pattern.test(key);
    };

    if (options.include) return options.include.some(match);

    if (options.exclude) return !options.exclude.some(match);

    return true;
  };

  // @ts-ignore
  for (const [object, key] of getAllProperties(self.constructor.prototype)) {
    if (key === 'constructor' || !filter(key)) {
      continue;
    }

    const descriptor = Reflect.getOwnPropertyDescriptor(object, key);
    if (descriptor && typeof descriptor.value === 'function') {
      // @ts-ignore
      self[key] = self[key].bind(self);
    }
  }

  return self;
}

export function createUseStore<TContext>(
  ctx: Context<TContext>,
  options?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    beforeMount?: (context: TContext, vm?: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    afterMount?: (context: TContext, vm?: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    beforeUnmount?: (context: TContext, vm?: any) => void;
  }
) {
  function useStore(): { context: TContext };
  function useStore<TViewModel extends new (context: TContext) => ViewModelConstructor<TContext>>(
    ViewModel: TViewModel
  ): { vm: InstanceType<TViewModel>; context: TContext };
  function useStore<
    TViewModel extends new (
      context: TContext,
      p: ConstructorParameters<TViewModel>[1]
    ) => ViewModelConstructor<TContext>,
  >(
    ViewModel: TViewModel,
    props: ConstructorParameters<TViewModel>[1]
  ): { vm: InstanceType<TViewModel>; context: TContext };
  function useStore(): { context: TContext };
  function useStore<TViewModel extends new (context: TContext) => ViewModelConstructor<TContext>>(
    ViewModel: TViewModel
  ): { vm: InstanceType<TViewModel>; context: TContext };
  function useStore<
    TViewModel extends new (
      context: TContext,
      p: ConstructorParameters<TViewModel>[1]
    ) => ViewModelConstructor<TContext>,
  >(
    ViewModel: TViewModel,
    props: ConstructorParameters<TViewModel>[1]
  ): { vm: InstanceType<TViewModel>; context: TContext };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function useStore(ViewModel?: any, props?: any) {
    const context = useContext(ctx);

    options?.beforeMount?.(context);

    onMount(() => {
      options?.afterMount?.(context);
    });

    onCleanup(() => {
      options?.beforeUnmount?.(context);
    });

    if (!ViewModel) return { context };

    const vm = new ViewModel(context, props);

    autoBind(vm);

    vm.beforeMount?.();

    onMount(() => {
      vm.afterMount?.();
    });

    onCleanup(() => {
      vm.beforeUnmount?.();
    });

    return { context, vm };
  }

  return useStore;
}
