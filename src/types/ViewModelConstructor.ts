// eslint-disable-next-line @typescript-eslint/consistent-type-definitions,@typescript-eslint/naming-convention
export interface ViewModelConstructor<TContext> {
  systemFileName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>;
  context: TContext;
  beforeMount?: () => void;
  afterMount?: () => void;
  beforeUnmount?: () => void;
}
