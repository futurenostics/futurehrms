// @ts-check
// Re-exports the root flat config plus the design-system lockdown plugin
// so workspaces only need a single import.
import rootConfig from '../../../eslint.config.mjs';
import fnTokens from './rules/no-default-utilities.mjs';

export default rootConfig;
export { fnTokens };
