import { EventObject } from '@dojo/core/Evented';
import { after } from '@dojo/core/aspect';
import SourceStore, { Path } from '@dojo/stores/Store';
import { PatchOperation } from '@dojo/stores/state/Patch';

import diagnosticEvents from '../diagnosticEvents';

export * from '@dojo/stores/Store';

export interface StoreApplyEvent extends StoreEventBase {
	invalidate?: boolean;
	operations: PatchOperation[];
	result: PatchOperation[];
	type: 'store:apply';
}

export interface StoreConstructEvent extends StoreEventBase {
	type: 'store:construct';
}

export interface StoreEventBase extends EventObject {
	target: Store;
}

export interface StoreGetEvent extends StoreEventBase {
	path: string;
	type: 'store:get';
	value: any;
}

export interface StoreInvalidateEvent extends StoreEventBase {
	type: 'store:invalidate';
}

export interface StoreNameEvent extends StoreEventBase {
	previous: string;
	type: 'store:set:name';
}

let storeUID = 0;

export class Store<T = any> extends SourceStore<T> {
	private _diagnosticName: string;

	public get name(): string {
		return this._diagnosticName;
	}
	public set name(value: string) {
		const previous = this._diagnosticName;
		this._diagnosticName = value;
		diagnosticEvents.emit({
			type: 'store:set:name',
			target: this,
			previous
		} as StoreNameEvent);
	}

	constructor() {
		super();

		this._diagnosticName = `store_${++storeUID}`;
		diagnosticEvents.emit({
			type: 'store:construct',
			target: this
		} as StoreConstructEvent);
		this.on('invalidate', () => {
			diagnosticEvents.emit({
				type: 'store:invalidate',
				target: this
			} as StoreInvalidateEvent);
		});
		after(this, 'apply', (result: PatchOperation[], originalArgs: any) => {
			const [operations, invalidate] = originalArgs as [PatchOperation[], boolean | undefined];
			diagnosticEvents.emit({
				type: 'store:apply',
				target: this,
				operations,
				invalidate,
				result
			} as StoreApplyEvent);
			return result;
		});
		after(this, 'get', (value: any, originalArgs: any) => {
			const [path] = originalArgs as [Path<any, any>];
			diagnosticEvents.emit({
				type: 'store:get',
				target: this,
				path: path.path,
				value
			} as StoreGetEvent);
			return value;
		});
	}
}

export default Store;
