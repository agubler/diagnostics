import { from as arrayFrom } from '@dojo/shim/array';
import global from '@dojo/shim/global';
import { isHNode } from '@dojo/widget-core/d';
import { DNode } from '@dojo/widget-core/interfaces';
import { InternalHNode } from '@dojo/widget-core/vdom';
import {
	eventLog,
	eventLogDepth,
	EventLogRecord,
	projectorMap,
	RenderLogRecord,
	setLogDepth
} from './diagnosticEvents';
import serializeDNode, { SerializedDNode } from './serializeDNode';

type CurrentNode = { children?: CurrentNode[] } | undefined | null | string;

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
		if (!(projectorMap.has(projector))) {
			throw new Error(`Projector "${projector}" missing from diagnostics`);
		}
		const segments = path.split('/');
		if (segments.shift()) {
			throw new Error(`Unexpected first segment to path: "${path}"`);
		}
		let current: CurrentNode = { children: [ projectorMap.get(projector)!.lastRender ] };
		while (segments.length) {
			if (!current || typeof current === 'string' || !current.children) {
				throw new Error(`Unresolveable path: "${path}`);
			}
			const index = Number(segments.shift());
			current = current.children[index];
		}
		return isHNode(current as DNode) && typeof (current as InternalHNode).domNode === 'object' && ((current as InternalHNode).domNode as HTMLElement) || undefined;
	}

	/**
	 * Retrieve a serialized version of the last render for the named projector.
	 * @param projector The name of the projector
	 */
	public getProjectorLastRender(projector: string): SerializedDNode {
		if (!(projectorMap.has(projector))) {
			throw new Error(`Projector "${projector}" missing from diagnostics`);
		}
		return serializeDNode(projectorMap.get(projector)!.lastRender);
	}

	/**
	 * Retrieve the render log for the named projector.
	 * @param projector The name of the projector
	 */
	public getProjectorRenderLog(projector: string): RenderLogRecord[] {
		if (!(projectorMap.has(projector))) {
			throw new Error(`Projector "${projector}" missing from diagnostics`);
		}
		return projectorMap.get(projector)!.renderLog;
	}

	/**
	 * Retrieve the names of the currently available diagnstic projectors.
	 */
	public getProjectors(): string[] {
		return arrayFrom(projectorMap.keys());
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
