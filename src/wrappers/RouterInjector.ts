import { Registry } from '@dojo/widget-core/Registry';
import { routerKey, RouterInjectorOptions } from '@dojo/routing/RouterInjector';
import { Injector } from '@dojo/widget-core/Injector';

import HashHistory from '@dojo/routing/history/HashHistory';
import { RouteConfig } from '@dojo/routing/interfaces';
import { Router } from './Router';

export { routerKey, RouterInjectorOptions } from '@dojo/routing/RouterInjector';

/**
 * Creates a router instance for a specific History manager (default is `HashHistory`) and registers
 * the route configuration.
 *
 * @param config The route config to register for the router
 * @param registry An optional registry that defaults to the global registry
 * @param options The router injector options
 */
export function registerRouterInjector(
	config: RouteConfig[],
	registry: Registry,
	options: RouterInjectorOptions = {}
): Router<any> {
	const { key = routerKey, history = new HashHistory() } = options;

	if (registry.hasInjector(key)) {
		throw new Error('Router has already been defined');
	}
	const router = new Router({ history, config });
	const injector = new Injector(router);
	router.on('navstart', () => {
		injector.emit({ type: 'invalidate' });
	});
	registry.defineInjector(key, injector);
	return router;
}
