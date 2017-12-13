import Evented from '@dojo/core/Evented';
import Map from '@dojo/shim/Map';
import { DNode } from '@dojo/widget-core/interfaces';
import { ProjectorConstructEvent, ProjectorNameEvent, ProjectionUpdateEvent, DiagnosticMixin } from './DiagnosticProjector';
import serializeDNode, { SerializedDNode } from './serializeDNode';

/**
 * Event types supported by diagnosticEvents
 */
export type DiagnosticEventTypes =
	'loaded:DiagnosticProjector' |
	'projector:attach' |
	'projector:construct' |
	'projector:render' |
	'projector:set:name';

export type DiagnosticEvents =
	ProjectorConstructEvent |
	ProjectorNameEvent |
	ProjectionUpdateEvent;

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
 * Change the name of a diagnostic projector
 * @param evt The event
 */
function changeNameProjector(evt: ProjectorNameEvent) {
	logEvent(evt);
	if (!(projectorMap.has(evt.previous))) {
		throw new Error(`Rename of projector "${evt.target}" failed due to missing in diagnostics`);
	}
	const value = projectorMap.get(evt.previous)!;
	projectorMap.delete(evt.previous);
	projectorMap.set(evt.target.name, value);
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
		data = {
			name: evt.target.name
		};
		break;
	case 'projector:set:name':
		data = {
			previous: evt.previous,
			name: evt.target.name
		};
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
	if (!(projectorMap.has(evt.target.name))) {
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
		'projector:set:name': changeNameProjector
	} as any
});

export default diagnosticEvents;
