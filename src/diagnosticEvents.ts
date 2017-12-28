import Evented from '@dojo/core/Evented';
import Map from '@dojo/shim/Map';
import { PatchOperation } from '@dojo/stores/state/Patch';
import { DNode } from '@dojo/widget-core/interfaces';
import {
	ProjectorConstructEvent,
	ProjectorNameEvent,
	ProjectionUpdateEvent,
	DiagnosticMixin
} from './wrappers/Projector';
import {
	RouterConstructEvent,
	RouterDispatchEvent,
	RouterDispatchRejectEvent,
	RouterNameEvent
} from './wrappers/Router';
import {
	Store,
	StoreApplyEvent,
	StoreConstructEvent,
	StoreGetEvent,
	StoreInvalidateEvent,
	StoreNameEvent
} from './wrappers/Store';
import serializeDNode, { SerializedDNode } from './serializeDNode';
import { serializeObject } from './util';

/**
 * Event types supported by diagnosticEvents
 */
export type DiagnosticEventTypes =
	| 'loaded:DiagnosticProjector'
	| 'projector:attach'
	| 'projector:construct'
	| 'projector:render'
	| 'projector:set:name'
	| 'router:construct'
	| 'router:dispatch'
	| 'router:dispatch:reject'
	| 'router:set:name'
	| 'store:apply'
	| 'store:construct'
	| 'store:get'
	| 'store:invalidate'
	| 'store:set:name';

export type DiagnosticEvents =
	| ProjectorConstructEvent
	| ProjectorNameEvent
	| ProjectionUpdateEvent
	| RouterConstructEvent
	| RouterDispatchEvent
	| RouterDispatchRejectEvent
	| RouterNameEvent
	| StoreApplyEvent
	| StoreConstructEvent
	| StoreGetEvent
	| StoreInvalidateEvent
	| StoreNameEvent;

export type EventData = {
	[key: string]: string | number | boolean | undefined | null;
};

export interface EventLogRecord {
	/**
	 * Data associated with the event
	 */
	data: EventData;

	/**
	 * Log level of the event
	 */
	level: 'error' | 'warn' | 'info';

	/**
	 * The timestamp of the event
	 */
	timestamp: number;

	/**
	 * The event type
	 */
	type: DiagnosticEventTypes;
}

export interface ProjectorData {
	/**
	 * The last render of the projector
	 */
	lastRender: DNode;

	/**
	 * A reference to the projector instance
	 */
	projector: DiagnosticMixin;

	/**
	 * A log of previous renders
	 */
	renderLog: RenderLogRecord[];
}

export interface StoreData {
	history: {
		ops: PatchOperation[];
		undo: PatchOperation[];
	}[];
	redo: {
		ops: PatchOperation[];
	}[];
	store: Store;
}

export interface RenderLogRecord {
	/**
	 * The amount of time (in milliseconds) it took to perform the `.render()` for the projector
	 */
	innerRender: number;

	/**
	 * The amount of time (in milliseconds) it took to complete the whole render process, including applying the virtual DOM
	 */
	outerRender: number;

	/**
	 * The serialized version of the render
	 */
	render: SerializedDNode;

	/**
	 * The timestamp of the event
	 */
	timestamp: number;
}

/**
 * A map of the currently available diagnostic projector data
 */
export const projectorMap = new Map<string, ProjectorData>();

export const storeMap = new Map<string, StoreData>();

/**
 * A log of diagnostic events
 */
export const eventLog: EventLogRecord[] = [];

/**
 * How many events should be retained in the log
 */
export let eventLogDepth = 100;

/**
 * How many render events should be retained for each projector
 */
export let renderLogDepth = 100;

/**
 * Add a diagnostic projector
 * @param evt The event
 */
function addProjector(evt: ProjectorConstructEvent) {
	logEvent(evt);
	projectorMap.set(evt.target.name, {
		lastRender: undefined,
		projector: evt.target,
		renderLog: []
	});
}

/**
 * Add a diagnostic store
 * @param evt The event
 */
function addStore(evt: StoreConstructEvent) {
	logEvent(evt);
	storeMap.set(evt.target.name, {
		history: [],
		redo: [],
		store: evt.target
	});
}

/**
 * Generate a history of store apply events
 * @param evt The event
 */
function applyStore(evt: StoreApplyEvent) {
	logEvent(evt);
	storeMap.get(evt.target.name)!.history.push({
		ops: evt.operations,
		undo: evt.result
	});
	storeMap.get(evt.target.name)!.redo = [];
}

/**
 * Change the name of a diagnostic projector
 * @param evt The event
 */
function changeNameProjector(evt: ProjectorNameEvent) {
	logEvent(evt);
	if (!projectorMap.has(evt.previous)) {
		throw new Error(`Rename of projector "${evt.target.name}" failed due to missing in diagnostics`);
	}
	const value = projectorMap.get(evt.previous)!;
	projectorMap.delete(evt.previous);
	projectorMap.set(evt.target.name, value);
}

function changeNameStore(evt: StoreNameEvent) {
	logEvent(evt);
	if (!storeMap.has(evt.previous)) {
		throw new Error(`Rename of store "${evt.target.name}" failed due to missing in diagnostics`);
	}
	const value = storeMap.get(evt.previous)!;
	storeMap.delete(evt.previous);
	storeMap.set(evt.target.name, value);
}

/**
 * Log a diagnostic event
 * @param evt The event
 */
export function logEvent(evt: DiagnosticEvents) {
	let data: EventData;
	switch (evt.type) {
		case 'projector:attach':
		case 'projector:render':
			data = {
				name: evt.target.name,
				innerRender: evt.innerDuration,
				outerRender: evt.outerDuration
			};
			break;
		case 'projector:construct':
		case 'router:construct':
		case 'store:construct':
		case 'store:invalidate':
			data = {
				name: evt.target.name
			};
			break;
		case 'projector:set:name':
		case 'router:set:name':
			data = {
				previous: evt.previous,
				name: evt.target.name
			};
			break;
		case 'router:dispatch':
			data = serializeObject({
				context: evt.context,
				path: evt.path,
				result: evt.result
			});
			break;
		case 'router:dispatch:reject':
			data = serializeObject({
				context: evt.context,
				path: evt.path,
				reason: evt.reason
			});
			break;
		case 'store:apply':
			data = serializeObject({
				invalidate: evt.invalidate,
				operations: evt.operations,
				result: evt.result
			});
			break;
		case 'store:get':
			data = serializeObject({
				path: evt.path,
				value: evt.value
			});
			break;
		default:
			data = {};
	}

	eventLog.push({
		data,
		level: 'info',
		timestamp: Date.now(),
		type: evt.type
	});
	while (eventLog.length > eventLogDepth) {
		eventLog.shift();
	}
}

/**
 * Set the number of event records to retain in the diagnostic event log
 * @param value The number of event records to retain in the diagnostic event log
 */
export function setLogDepth(value: number) {
	eventLogDepth = value;
}

/**
 * A render event occured, update the diagnostic projector data
 * @param evt The event
 */
function updateRender(evt: ProjectionUpdateEvent) {
	logEvent(evt);
	if (!projectorMap.has(evt.target.name)) {
		throw new Error(`Projector "${evt.target.name}" missing from diagnostics`);
	}
	const projectorData = projectorMap.get(evt.target.name)!;
	projectorData.lastRender = evt.result;
	const renderLog = projectorData.renderLog;
	renderLog.push({
		innerRender: evt.innerDuration,
		outerRender: evt.outerDuration,
		render: serializeDNode(evt.result),
		timestamp: Date.now()
	});
	while (renderLog.length > renderLogDepth) {
		renderLog.shift();
	}
}

/**
 * An event bus for diagnostic events
 */
export const diagnosticEvents = new Evented({
	// Evented currently doesn't really do well with typed event listeners, so casting as any
	listeners: {
		'loaded:DiagnosticProjector': logEvent,
		'projector:construct': addProjector,
		'projector:attach': updateRender,
		'projector:render': updateRender,
		'projector:set:name': changeNameProjector,
		'router:construct': logEvent,
		'router:dispatch': logEvent,
		'router:dispatch:reject': logEvent,
		'router:set:name': logEvent,
		'store:apply': applyStore,
		'store:construct': addStore,
		'store:invalidate': logEvent,
		'store:set:name': changeNameStore
	} as any
});

export default diagnosticEvents;
