/* eslint-disable no-unused-expressions, no-restricted-syntax,
@typescript-eslint/naming-convention, @typescript-eslint/no-empty-function,
no-useless-constructor */

import { expect } from 'chai';
import { spy } from 'sinon';
import { $PROXY, createContext, createRenderEffect, createSignal, useContext } from 'solid-js';
import { render, renderHook } from '@solidjs/testing-library';
import { createMutable } from 'solid-js/store';

import { createUseStore } from '../src/createUseStore.js';
import { ViewModelConstructor } from '../src/types/ViewModelConstructor.js';

describe('createUseStore', () => {
  const testContextValues = [
    undefined,
    null,
    'string',
    1,
    { someParam: 'value' },
    [1],
    function someFunction() {},
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getElementContent(container: any, className: string) {
    return container.getElementsByClassName(className)[0].innerHTML;
  }

  test('hook (empty): context is correct', () => {
    function check<TContext>(contextValue: TContext) {
      const StoreContext = createContext(contextValue);

      const useStore = createUseStore(StoreContext);

      const { result } = renderHook(() => useStore());

      expect(result.context).to.deep.eq(contextValue);
    }

    testContextValues.forEach((contextValue) => check(contextValue));
  });

  test('hook (only VM): context is correct & vm has correct context', () => {
    function check<TContext>(contextValue: TContext) {
      const StoreContext = createContext(contextValue);

      const useStore = createUseStore(StoreContext);

      type ViewModel = ViewModelConstructor<TContext>;

      class VM implements ViewModel {
        constructor(public context: TContext) {
          return createMutable(this);
        }
      }

      const { result } = renderHook(() => useStore(VM));

      expect(result.context).to.deep.eq(contextValue);
      expect(result.vm).to.deep.eq({ context: contextValue });
    }

    testContextValues.forEach((contextValue) => check(contextValue));
  });

  test('hook (VM + props): context is correct & vm has correct context and props', () => {
    function check<TContext>(contextValue: TContext, initialProps: { data: string }) {
      const StoreContext = createContext(contextValue);

      const useStore = createUseStore(StoreContext);

      type ViewModel = ViewModelConstructor<TContext>;

      class VM implements ViewModel {
        constructor(
          public context: TContext,
          public props: typeof initialProps
        ) {
          return createMutable(this);
        }
      }

      const { result } = renderHook((props) => useStore(VM, props), {
        initialProps: [initialProps],
      });

      expect(result.context).to.deep.eq(contextValue);
      expect(result.vm).to.deep.eq({ context: contextValue, props: initialProps });
      // @ts-ignore
      expect(result.vm.props[$PROXY]).to.deep.eq(initialProps);
    }

    testContextValues.forEach((contextValue) => check(contextValue, { data: 'string' }));
  });

  test('hook (VM + props): createRenderEffects are cleared', () => {
    function check<TContext>(contextValue: TContext, initialProps: { data: string }) {
      const StoreContext = createContext(contextValue);

      const useStore = createUseStore(StoreContext);

      const spy_autorun = spy();

      type ViewModel = ViewModelConstructor<TContext>;

      class VM implements ViewModel {
        constructor(
          public context: TContext,
          public props: typeof initialProps
        ) {
          return createMutable(this);
        }

        beforeMount() {
          createRenderEffect(() => {
            spy_autorun(this.props.data);
          });
        }
      }

      const { result, cleanup } = renderHook((props) => useStore(VM, props), {
        initialProps: [initialProps],
      });

      expect(spy_autorun.callCount, 'spy_autorun').to.deep.eq(1);
      expect(spy_autorun.getCall(0).args[0], 'spy_autorun').to.deep.eq('string');

      result.vm.props.data = 'string2';

      expect(spy_autorun.callCount, 'spy_autorun').to.deep.eq(2);
      expect(spy_autorun.getCall(1).args[0], 'spy_autorun').to.deep.eq('string2');

      cleanup();

      // should not call createRenderEffect after cleanup
      result.vm.props.data = 'string3';

      expect(spy_autorun.callCount, 'spy_autorun').to.deep.eq(2);
      expect(spy_autorun.getCall(1).args[0], 'spy_autorun').to.deep.eq('string2');
    }

    testContextValues.forEach((contextValue) => check(contextValue, { data: 'string' }));
  });

  test('component (VM + props): rerenders', () => {
    function check<TContext>(contextValue: TContext, initialProps: { data: string }) {
      const StoreContext = createContext(contextValue);

      const useStore = createUseStore(StoreContext);

      const spy_render = spy();

      type ViewModel = ViewModelConstructor<TContext>;

      class VM implements ViewModel {
        constructor(
          public context: TContext,
          public props: typeof initialProps
        ) {
          return createMutable(this);
        }

        get computedData() {
          return `${this.props.data}_computed`;
        }
      }

      function MyComponent(props: typeof initialProps) {
        const { vm } = useStore(VM, props);

        return (
          <>
            <div class={'computed'}>
              {vm.computedData}
              {spy_render(props.data, vm.computedData)}
            </div>
            <div class={'prop'}>{props.data}</div>
          </>
        );
      }

      const [initial, setInitial] = createSignal(initialProps);

      const { container } = render(() => <MyComponent {...initial()} />);

      expect(container.getElementsByClassName('computed')[0].innerHTML).to.eq(`string_computed`);
      expect(container.getElementsByClassName('prop')[0].innerHTML).to.eq(`string`);

      expect(spy_render.callCount, 'spy_render').to.deep.eq(1);
      expect(spy_render.getCall(0).args[0], 'spy_render').to.deep.eq('string');
      expect(spy_render.getCall(0).args[1], 'spy_render').to.deep.eq('string_computed');

      setInitial({ data: 'string2' });

      expect(container.getElementsByClassName('computed')[0].innerHTML).to.eq(`string2_computed`);
      expect(container.getElementsByClassName('prop')[0].innerHTML).to.eq(`string2`);
      expect(spy_render.callCount, 'spy_render').to.deep.eq(2);

      expect(spy_render.getCall(1).args[0], 'spy_render').to.deep.eq('string2');
      expect(spy_render.getCall(1).args[1], 'spy_render').to.deep.eq('string2_computed');
    }

    testContextValues.forEach((contextValue) => check(contextValue, { data: 'string' }));
  });

  test('component (VM + props): several contexts', () => {
    function check<TContext>(contextValue: TContext, initialProps: { data: { foo: string } }) {
      const StoreContext = createContext(contextValue);
      const StoreContext2 = createContext({ data: 'string' });

      const useStore = createUseStore(StoreContext);

      type ViewModel = ViewModelConstructor<TContext>;

      class VM implements ViewModel {
        constructor(
          public context: TContext,
          public props: typeof initialProps & { context2: { data: string } }
        ) {
          return createMutable(this);
        }

        get context2Data() {
          return this.props.context2.data;
        }
      }

      function MyComponent(props: typeof initialProps) {
        const context2 = useContext(StoreContext2);

        const { vm } = useStore(VM, { ...props, context2 });

        return <div class={'computed'}>{vm.context2Data}</div>;
      }

      const { container } = render(() => <MyComponent {...initialProps} />);

      expect(getElementContent(container, 'computed')).to.eq(`string`);
    }

    testContextValues.forEach((contextValue) => check(contextValue, { data: { foo: 'string' } }));
  });

  test('hook (empty): lifecycle called', () => {
    function check<TContext>(contextValue: TContext, initialProps: { data: string }) {
      const StoreContext = createContext(contextValue);

      const spy_globalBeforeMount = spy();
      const spy_globalAfterMount = spy();
      const spy_globalBeforeUnmount = spy();

      const useStore = createUseStore(StoreContext, {
        beforeMount() {
          spy_globalBeforeMount();
        },
        afterMount() {
          spy_globalAfterMount();
        },
        beforeUnmount() {
          spy_globalBeforeUnmount();
        },
      });

      function MyComponent(props: typeof initialProps) {
        useStore();

        return <>{props.data}</>;
      }

      const [initial, setInitial] = createSignal(initialProps);

      const { unmount } = render(() => <MyComponent {...initial()} />);

      expect(spy_globalBeforeMount.callCount, 'spy_globalBeforeMount').to.deep.eq(1);
      expect(spy_globalAfterMount.callCount, 'spy_globalAfterMount').to.deep.eq(1);
      expect(spy_globalBeforeUnmount.callCount, 'spy_globalBeforeUnmount').to.deep.eq(0);

      setInitial({ data: 'string2' });

      expect(spy_globalBeforeMount.callCount, 'spy_globalBeforeMount').to.deep.eq(1);
      expect(spy_globalAfterMount.callCount, 'spy_globalAfterMount').to.deep.eq(1);
      expect(spy_globalBeforeUnmount.callCount, 'spy_globalBeforeUnmount').to.deep.eq(0);

      unmount();

      expect(spy_globalBeforeMount.callCount, 'spy_globalBeforeMount').to.deep.eq(1);
      expect(spy_globalAfterMount.callCount, 'spy_globalAfterMount').to.deep.eq(1);
      expect(spy_globalBeforeUnmount.callCount, 'spy_globalBeforeUnmount').to.deep.eq(1);
    }

    testContextValues.forEach((contextValue) => check(contextValue, { data: 'string' }));
  });

  test('hook (only VM): lifecycle called', () => {
    function check<TContext>(contextValue: TContext, initialProps: { data: string }) {
      const StoreContext = createContext(contextValue);

      const spy_globalBeforeMount = spy();
      const spy_globalAfterMount = spy();
      const spy_globalBeforeUnmount = spy();

      const useStore = createUseStore(StoreContext, {
        beforeMount() {
          spy_globalBeforeMount();
        },
        afterMount() {
          spy_globalAfterMount();
        },
        beforeUnmount() {
          spy_globalBeforeUnmount();
        },
      });

      type ViewModel = ViewModelConstructor<TContext>;

      const spy_beforeMount = spy();
      const spy_afterMount = spy();
      const spy_beforeUnmount = spy();

      class VM implements ViewModel {
        constructor(public context: TContext) {
          return createMutable(this);
        }

        beforeMount() {
          spy_beforeMount();
        }

        afterMount() {
          spy_afterMount();
        }

        beforeUnmount() {
          spy_beforeUnmount();
        }
      }

      function MyComponent(props: typeof initialProps) {
        useStore(VM);

        return <>{props.data}</>;
      }

      const [initial, setInitial] = createSignal(initialProps);

      const { unmount } = render(() => <MyComponent {...initial()} />);

      expect(spy_globalBeforeMount.callCount, 'spy_globalBeforeMount').to.deep.eq(1);
      expect(spy_globalAfterMount.callCount, 'spy_globalAfterMount').to.deep.eq(1);
      expect(spy_globalBeforeUnmount.callCount, 'spy_globalBeforeUnmount').to.deep.eq(0);

      expect(spy_beforeMount.callCount, 'spy_beforeMount').to.deep.eq(1);
      expect(spy_afterMount.callCount, 'spy_afterMount').to.deep.eq(1);
      expect(spy_beforeUnmount.callCount, 'spy_beforeUnmount').to.deep.eq(0);

      setInitial({ data: 'string2' });

      expect(spy_globalBeforeMount.callCount, 'spy_globalBeforeMount').to.deep.eq(1);
      expect(spy_globalAfterMount.callCount, 'spy_globalAfterMount').to.deep.eq(1);
      expect(spy_globalBeforeUnmount.callCount, 'spy_globalBeforeUnmount').to.deep.eq(0);

      expect(spy_beforeMount.callCount, 'spy_beforeMount').to.deep.eq(1);
      expect(spy_afterMount.callCount, 'spy_afterMount').to.deep.eq(1);
      expect(spy_beforeUnmount.callCount, 'spy_beforeUnmount').to.deep.eq(0);

      unmount();

      expect(spy_globalBeforeMount.callCount, 'spy_globalBeforeMount').to.deep.eq(1);
      expect(spy_globalAfterMount.callCount, 'spy_globalAfterMount').to.deep.eq(1);
      expect(spy_globalBeforeUnmount.callCount, 'spy_globalBeforeUnmount').to.deep.eq(1);

      expect(spy_beforeMount.callCount, 'spy_beforeMount').to.deep.eq(1);
      expect(spy_afterMount.callCount, 'spy_afterMount').to.deep.eq(1);
      expect(spy_beforeUnmount.callCount, 'spy_beforeUnmount').to.deep.eq(1);
    }

    testContextValues.forEach((contextValue) => check(contextValue, { data: 'string' }));
  });
});
