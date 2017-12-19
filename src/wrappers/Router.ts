import { EventObject } from '@dojo/core/Evented';
import { after } from '@dojo/core/aspect';
import Task from '@dojo/core/async/Task';
import { Context, DispatchResult, RouterOptions } from '@dojo/routing/interfaces';
import SourceRouter from '@dojo/routing/Router';
export * from '@dojo/routing/Router';

import diagnosticEvents from '../diagnosticEvents';

export interface RouterConstructEvent extends EventObject {
	options?: RouterOptions<Context>;
	target: Router<Context>;
	type: 'router:construct';
}

export interface RouterDispatchEvent extends RouterDipatchBaseEvent {
	result: DispatchResult;
	type: 'router:dispatch';
}

export interface RouterDipatchBaseEvent extends EventObject {
	context: Context;
	path: string;
	target: Router<Context>;
}

export interface RouterDispatchRejectEvent extends RouterDipatchBaseEvent {
	reason: any;
	type: 'router:dispatch:reject';
}

export interface RouterNameEvent extends EventObject {
	/**
	 * The previous name of the router
	 */
	previous: string;

	/**
	 * The diagnostic router which has its new name
	 */
	target: Router<Context>;
	type: 'router:set:name';
}

let routerUID = 0;

export class Router<C extends Context> extends SourceRouter<C> {
	private _diagnosticName: string;

	public get name(): string {
		return this._diagnosticName;
	}
	public set name(value: string) {
		const previous = this._diagnosticName;
		this._diagnosticName = value;
		diagnosticEvents.emit({
			type: 'router:set:name',
			target: this,
			previous
		} as RouterNameEvent);
	}

	constructor(options?: RouterOptions<C>) {
		super(options);

		this._diagnosticName = `router_${++routerUID}`;
		diagnosticEvents.emit({
			type: 'router:construct',
			target: this,
			options
		} as RouterConstructEvent);
		after(this, 'dispatch', (originalReturn: Task<DispatchResult>, originalArgs: any) => {
			const [context, path] = originalArgs as [C, string];
			originalReturn.then(
				(result) => {
					diagnosticEvents.emit({
						type: 'router:dispatch',
						target: this,
						context,
						path,
						result
					} as RouterDispatchEvent);
				},
				(reason) => {
					diagnosticEvents.emit({
						type: 'router:dispatch:reject',
						target: this,
						context,
						path,
						reason
					} as RouterDispatchRejectEvent);
				}
			);
			return originalReturn;
		});
	}
}

export default Router;
