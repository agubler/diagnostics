import { isWNode, isHNode } from '@dojo/widget-core/d';
import {
	DefaultWidgetBaseInterface,
	DNode,
	VirtualDomProperties,
	WidgetBaseInterface
} from '@dojo/widget-core/interfaces';
import { InternalHNode, InternalWNode } from '@dojo/widget-core/vdom';

export interface SerializedHNode {
	/**
	 * Any children on the node
	 */
	children?: SerializedDNode[];

	/**
	 * `true` if there is a DOM Node associated, otherwise `false`
	 */
	domNode?: boolean;

	/**
	 * Is the node inserted in the DOM
	 */
	inserted?: boolean;

	/**
	 * Any properties for the DOM node
	 */
	properties: SerializedProperties<VirtualDomProperties>;

	/**
	 * The tag name of the node
	 */
	tag: string;

	/**
	 * Any text associated with the node
	 */
	text?: string;

	/**
	 * The type of the node
	 */
	type: 'hnode';
}

/**
 * A type used to map property keys to values that represent what is being serialized
 */
export type SerializedProperties<T>  = {
	[P in keyof T]: string | number | boolean | undefined | null;
};

export interface SerializedWNode<W extends WidgetBaseInterface = DefaultWidgetBaseInterface> {
	/**
	 * Any children on the node
	 */
	children: SerializedDNode[];

	/**
	 * Properties used by the widgeting system
	 */
	coreProperties: SerializedProperties<any>;

	/**
	 * Any properties on the node
	 */
	properties: SerializedProperties<W['properties']>;

	/**
	 * The widget as rendered
	 */
	rendered: SerializedDNode[];

	/**
	 * The type of the node
	 */
	type: 'wnode';

	/**
	 * A string representation of the widget constructor
	 */
	widgetConstructor: string;
}

/**
 * A DNode that is in a format that is easier to serialize for diagnostic purposes
 */
export type SerializedDNode = SerializedHNode | SerializedWNode | undefined | null | string;

/**
 * Convert an array of `DNode`s into a serializable format
 * @param value The array of DNodes to convert
 */
function serializeDNodeArray(value: DNode[]): SerializedDNode[] {
	return value.map((dnode) => serializeDNode(dnode));
}

/**
 * Convert an `InternalHNode` to a `SerializedHNode`
 * @param value The HNode to convert
 */
function serializeHNode(value: InternalHNode): SerializedHNode {
	const hnode: SerializedHNode = {
		inserted: value.inserted,
		domNode: value.domNode ? true : false,
		properties: serializeProperties(value.properties),
		tag: value.tag,
		text: value.text,
		type: 'hnode'
	};
	if (value.children) {
		hnode.children = serializeDNodeArray(value.children);
	}
	return hnode;
}

/**
 * An internal function which takes the values of properties and serializes the values
 * @param properties Any set of properties to be serialized
 */
function serializeProperties<P>(properties: P): SerializedProperties<P> {
	const serialized: { [K in keyof P]: any; } = {} as any;
	const keys: (keyof P)[] = Object.keys(properties) as any;
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (key === 'bind') {
			continue;
		}
		const value = properties[key];
		switch (typeof value) {
		case 'function':
			serialized[key] = `@@function${(value as any).name ? `(${(value as any).name})` : ''}`;
			break;
		case 'object':
			if (value === null) {
				serialized[key] = '@@null';
			}
			else {
				try {
					serialized[key] = JSON.stringify(value);
				}
				catch {
					serialized[key] = `@@object${value.constructor && (value.constructor as any).name ? `(${(value.constructor as any).name})` : ''}`;
				}
			}
			break;
		default:
			serialized[key] = value;
		}
	}
	return serialized;
}

/**
 * Convert an `InternalWNode` to a `SerializedWNode`
 * @param value The WNode to convert
 */
function serializeWNode(value: InternalWNode): SerializedWNode {
	const wnode: SerializedWNode = {
		children: serializeDNodeArray(value.children),
		properties: serializeProperties(value.properties),
		rendered: serializeDNodeArray(value.rendered),
		coreProperties: serializeProperties(value.coreProperties),
		type: 'wnode',
		widgetConstructor: (value.widgetConstructor as any).name || ''
	};
	return wnode;
}

/**
 * Convert a `DNode` into a format that is more easily serializable for diagnostic purposes
 * @param value The target `DNode` to convert into a serializable form
 */
export default function serializeDNode(value: DNode): SerializedDNode {
	return isWNode(value) ?
		serializeWNode(value as InternalWNode) : isHNode(value) ?
			serializeHNode(value as InternalHNode) : value;
}
