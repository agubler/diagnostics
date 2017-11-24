import { v, w } from '@dojo/widget-core/d';
import Registry from '@dojo/widget-core/Registry';
import { registerThemeInjector } from '@dojo/widget-core/mixins/Themed';
import Button from '@dojo/widgets/button/Button';
import Calendar from '@dojo/widgets/calendar/Calendar';
import theme from '@dojo/widgets/themes/dojo/theme';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import Projector from '../DiagnosticProjector';

// import for side effects
import '../main';

class App extends WidgetBase {
	private _onclick() {
		console.log('App._onclick()');
	}
	private _onClick() {
		console.log('App._onClick()');
	}

	render() {
		return v('div', {}, [
			w(Button, {
				key: 'foo',
				onClick: this._onClick
			}, [ 'Click me!' ]),
			v('button', {
				key: 1,
				onclick: this._onclick
			}, [ 'Click me!' ]),
			v('div', {}, [
				w(Calendar, {
					key: 'calendar',
					selectedDate: new Date()
				})
			])
		]);
	}
}

const registry = new Registry();
registerThemeInjector(theme, registry);
const projector = new (Projector(App))();
projector.setProperties({
	registry
});
projector.name = 'main';
projector.append();
