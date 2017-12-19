import { EventObject } from '@dojo/core/Evented';
import { around, on } from '@dojo/core/aspect';
import { DNode } from '@dojo/widget-core/interfaces';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import SourceProjectorMixin from '@dojo/widget-core/mixins/Projector';
export * from '@dojo/widget-core/mixins/Projector';

import { Constructor, WidgetProperties } from '@dojo/widget-core/interfaces';
import diagnosticEvents from '../diagnosticEvents';

export interface DiagnosticMixin extends SourceProjectorMixin<WidgetProperties> {
	name: string;
}

export interface ProjectorConstructEvent extends EventObject {
	type: 'projector:construct';

	/**
	 * The diagnostic projector that was constructed
	 */
	target: DiagnosticMixin;
}

export interface ProjectorNameEvent extends EventObject {
	/**
	 * The previous name of the projector
	 */
	previous: string;

	/**
	 * The diagnostic projector which has its new name
	 */
	target: DiagnosticMixin;
	type: 'projector:set:name';
}

export interface ProjectionUpdateEvent extends EventObject {
	/**
	 * The duration of the rendering in milliseconds of the projector excluding the time applying to the vdom
	 */
	innerDuration: number;

	/**
	 * The duration of the rendering in milliseconds of the projector including the time applying the vdom
	 */
	outerDuration: number;

	/**
	 * The diagnostic projector that projection update relates to
	 */
	target: DiagnosticMixin;

	/**
	 * The type of the event
	 */
	type: 'projector:attach' | 'projector:render';

	/**
	 * The resulting DNode from the projector after it has been applied to the DOM
	 */
	result: DNode;
}

/**
 * An ID variable for tracking instances of diagnostic projectors
 */
let projectorUID = 0;

diagnosticEvents.emit({ type: 'loaded:DiagnosticProjector' });

export function DiagnosticMixin<P extends Constructor<SourceProjectorMixin<WidgetProperties>>>(
	Base: P
): P & Constructor<DiagnosticMixin> {
	class Projector extends Base {
		private _diagnosticName: string;
		private _diagnosticRender: DNode;
		private _diagnosticRenderDuration: number;
		private _diagnosticStart: number;

		public get name(): string {
			return this._diagnosticName;
		}
		public set name(value: string) {
			const previous = this._diagnosticName;
			this._diagnosticName = value;
			diagnosticEvents.emit({
				type: 'projector:set:name',
				target: this,
				previous
			} as ProjectorNameEvent);
		}

		constructor(...args: any[]) {
			super(...args);

			this._diagnosticName = `projector_${++projectorUID}`;
			diagnosticEvents.emit({
				type: 'projector:construct',
				target: this
			} as ProjectorConstructEvent);
			around(this, '_boundRender', (previous) => {
				return () => {
					const start = (this._diagnosticStart = performance.now());
					const result = (this._diagnosticRender = previous());
					this._diagnosticRenderDuration = performance.now() - start;
					return result;
				};
			});
			on(this, '_attach', () => {
				const stop = performance.now();
				diagnosticEvents.emit({
					innerDuration: this._diagnosticRenderDuration,
					outerDuration: stop - this._diagnosticStart,
					type: 'projector:attach',
					target: this,
					result: this._diagnosticRender
				} as ProjectionUpdateEvent);
			});
			on(this, '_boundDoRender', () => {
				const stop = performance.now();
				diagnosticEvents.emit({
					innerDuration: this._diagnosticRenderDuration,
					outerDuration: stop - this._diagnosticStart,
					type: 'projector:render',
					target: this,
					result: this._diagnosticRender
				} as ProjectionUpdateEvent);
			});
		}
	}

	return Projector;
}

export function ProjectorMixin<P, T extends Constructor<WidgetBase<P>>>(
	Base: T
): T & Constructor<SourceProjectorMixin<{}>> & Constructor<DiagnosticMixin> {
	return DiagnosticMixin(SourceProjectorMixin(Base));
}

export default ProjectorMixin;
