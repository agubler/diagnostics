import { from as arrayFrom } from '@dojo/shim/array';
import global from '@dojo/shim/global';
import { PatchOperation } from '@dojo/stores/state/Patch';
import { isHNode } from '@dojo/widget-core/d';
import { DNode } from '@dojo/widget-core/interfaces';
import { InternalHNode } from '@dojo/widget-core/vdom';
import {
	eventLog,
	eventLogDepth,
	EventLogRecord,
	projectorMap,
	RenderLogRecord,
	setLogDepth,
	storeMap
} from './diagnosticEvents';
import serializeDNode, { SerializedDNode } from './serializeDNode';

type CurrentNode = { children?: CurrentNode[]; rendered?: CurrentNode[] } | undefined | null | string;

const VERSION = '0.0.1';

interface HighlightedNode {
	node: HTMLElement;
	outline: HTMLElement['style']['outline'];
	backgroundColor: HTMLElement['style']['backgroundColor'];
}

export class DiagnosticAPI {
	private _highlightedNode?: HighlightedNode;

	/**
	 * The `style.outline` to be applied to a node when it is highlighted
	 */
	public highlightOutline = '1px dashed #006be6';

	/**
	 * The `style.backgroundColor` to be applied to a node when it is highlighted
	 */
	public highlightBackgroundColor = 'rgba(0,107,230,0.1)';

	/**
	 * The version of the diagnostic API
	 */
	public get version(): string {
		return VERSION;
	}

	/**
	 * The diagnostic event log
	 */
	public get eventLog(): EventLogRecord[] {
		return eventLog;
	}

	/**
	 * The maximum number of records to be retained in the event log
	 */
	public get eventLogDepth(): number {
		return eventLogDepth;
	}
	public set eventLogDepth(value: number) {
		setLogDepth(value);
	}

	/**
	 * Return a DOM Node that a rendered `HNode` is tied to, if not rendered or the path does not refer to an `HNode`, the function
	 * returns `undefined`.
	 * @param projector The name of the projector
	 * @param path The path to the HNode to retrieve the DOM Node for
	 */
	public getDomNode(projector: string, path: string): HTMLElement | undefined {
		if (!projectorMap.has(projector)) {
			throw new Error(`Projector "${projector}" missing from diagnostics`);
		}
		const segments = path.split('/');
		if (segments.shift()) {
			throw new Error(`Unexpected first segment to path: "${path}"`);
		}
		let current: CurrentNode = { children: [projectorMap.get(projector)!.lastRender] };
		while (segments.length) {
			if (!current || typeof current === 'string' || (!current.rendered && !current.children)) {
				throw new Error(`Unresolveable path: "${path}`);
			}
			const index = Number(segments.shift());
			current = (current.rendered && current.rendered[index]) || current.children![index];
		}
		return (
			(isHNode(current as DNode) &&
				typeof (current as InternalHNode).domNode === 'object' &&
				((current as InternalHNode).domNode as HTMLElement)) ||
			undefined
		);
	}

	/**
	 * Retrieve a serialized version of the last render for the named projector.
	 * @param projector The name of the projector
	 */
	public getProjectorLastRender(projector: string): SerializedDNode {
		if (!projectorMap.has(projector)) {
			throw new Error(`Projector "${projector}" missing from diagnostics`);
		}
		return serializeDNode(projectorMap.get(projector)!.lastRender);
	}

	/**
	 * Retrieve the render log for the named projector.
	 * @param projector The name of the projector
	 */
	public getProjectorRenderLog(projector: string): RenderLogRecord[] {
		if (!projectorMap.has(projector)) {
			throw new Error(`Projector "${projector}" missing from diagnostics`);
		}
		return projectorMap.get(projector)!.renderLog;
	}

	/**
	 * Retrieve the names of the currently available diagnostic projectors.
	 */
	public getProjectors(): string[] {
		return arrayFrom(projectorMap.keys());
	}

	/**
	 * Retrieve the names of the currently available diagnostic stores.
	 */
	public getStores(): string[] {
		return arrayFrom(storeMap.keys());
	}

	/**
	 * Provide the lengths of the current store history stack and redo stack
	 * @param store The string name of the store to return the information for
	 */
	public getStoreTransactionLengths(store: string): { history: number; redo: number } {
		if (!storeMap.has(store)) {
			throw new Error(`Store "${store}" missing from diagnostics`);
		}
		const storeData = storeMap.get(store)!;
		return {
			history: storeData.history.length,
			redo: storeData.redo.length
		};
	}

	/**
	 * Retrieve the current state of the store
	 * @param store The name of the store
	 */
	public getStoreState(store: string): any {
		if (!storeMap.has(store)) {
			throw new Error(`Store "${store}" missing from diagnostics`);
		}
		return storeMap.get(store)!.store.path('/__diagnostics__').state;
	}

	/**
	 * Highlight a DOM Node that has been rendered based on its referenced `HNode`
	 * @param projector The name of the projector
	 * @param path The path to an HNode
	 */
	public highlight(projector: string, path: string): void {
		this.unhighlight();
		const node = this.getDomNode(projector, path);
		if (!node || !node.style) {
			return;
		}
		const { outline, backgroundColor } = node.style;
		this._highlightedNode = {
			node,
			outline,
			backgroundColor
		};
		node.style.outline = this.highlightOutline;
		node.style.backgroundColor = this.highlightBackgroundColor;
	}

	/**
	 * Time travel in the named store, providing an integer of the number of sets of stored operations to apply
	 * to the store.  A positive integer will travel forward (redo already undone transactions) and a negative
	 * integer will travel backwards (undo previous applied patches to the store).
	 * @param storeName The string name of the store that is the target
	 * @param distance The distances forward (positive integer) or backwards (neagtive integer) to time travel
	 * @param invalidate Should the store be invalidated when travelling.  Defaults to `true`.
	 */
	public storeTravel(storeName: string, distance: number, invalidate = true): PatchOperation[] {
		if (!storeMap.has(storeName)) {
			throw new Error(`Store "${storeName}" missing from diagnostics`);
		}
		if (!distance) {
			return [];
		}
		const { history, redo, store } = storeMap.get(storeName)!;
		let result: PatchOperation[] = [];
		if (distance > 0) {
			const redoLength = redo.length;
			if (distance > redoLength) {
				throw new Error(`Store "${storeName}" cannot travel forward by ${distance}`);
			}
			while (distance > 0) {
				distance--;
				const { ops } = redo.shift()!;
				// we have patched apply so that it takes a 3rd argument, skipping the diagnostic event
				const undo: PatchOperation[] = (store.apply as any)(ops, invalidate, true);
				result = result.concat(ops);
				history.push({
					ops,
					undo
				});
			}
		} else {
			distance = Math.abs(distance);
			const historyLength = history.length;
			if (distance > historyLength) {
				throw new Error(`Store "${storeName}" cannot travel backwards by ${distance}`);
			}
			while (distance > 0) {
				distance--;
				const { ops, undo } = history.pop()!;
				// we have patched apply so that it takes a 3rd argument, skipping the diagnostic event
				(store.apply as any)(undo, invalidate, true);
				result = result.concat(undo);
				redo.unshift({
					ops
				});
			}
		}
		return result;
	}

	/**
	 * Unhighlight the currently highlighted DOM node.  If there is none highlighted, this is a noop.
	 */
	public unhighlight(): void {
		if (!this._highlightedNode) {
			return;
		}
		const { node, outline, backgroundColor } = this._highlightedNode;
		node.style.outline = outline;
		node.style.backgroundColor = backgroundColor;
		this._highlightedNode = undefined;
	}
}

/**
 * The diagnostic API for Dojo 2
 */
export const diagnosticAPI = new DiagnosticAPI();

declare global {
	/**
	 * The diagnostic API for Dojo 2
	 */
	/* tslint:disable-next-line:variable-name */
	const __dojo2_diagnostics__: DiagnosticAPI;
}

global.__dojo2_diagnostics__ = diagnosticAPI;

export default diagnosticAPI;
