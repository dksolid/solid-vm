/**
 * @docs: https://github.com/okonet/lint-staged
 *
 * Runs commands for files added to commit
 * Just simpler than creating own bash script with such recipe
 *
 */

// eslint-disable-next-line import/no-default-export
export default {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  '(*.js|*.ts|*.cjs|*.mjs)': ['pnpm run format:js'],
};
