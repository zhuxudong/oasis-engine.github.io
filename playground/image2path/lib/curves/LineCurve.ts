import { Vector2 } from 'oasis-engine';
import Curve from '../Curve';

class LineCurve extends Curve {

	constructor( v1 = new Vector2(), v2 = new Vector2() ) {

		super();

		this.type = 'LineCurve';

		this.v1 = v1;
		this.v2 = v2;

	}

	getPoint( t, optionalTarget = new Vector2() ) {

		const point = optionalTarget;

		if ( t === 1 ) {
			this.v2.cloneTo(point);

		} else {
			this.v2.cloneTo(point);
			point.subtract( this.v1 );
			point.scale( t ).add( this.v1 );

		}

		return point;

	}

	// Line curve is linear, so we can overwrite default getPointAt
	getPointAt( u, optionalTarget ) {

		return this.getPoint( u, optionalTarget );

	}

}

LineCurve.prototype.isLineCurve = true;

export { LineCurve };
