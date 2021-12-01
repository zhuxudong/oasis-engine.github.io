import { Vector2 } from 'oasis-engine';

const _vector = /*@__PURE__*/ new Vector2();

class Box2 {

	constructor( min = new Vector2( + Infinity, + Infinity ), max = new Vector2( - Infinity, - Infinity ) ) {

		this.min = min;
		this.max = max;

	}

	set( min, max ) {

		this.min.copy( min );
		this.max.copy( max );

		return this;

	}

	clone() {

		return new this.constructor().copy( this );

	}

	copy( box ) {

		this.min.copy( box.min );
		this.max.copy( box.max );

		return this;

	}

	isEmpty() {

		// this is a more robust check for empty than ( volume <= 0 ) because volume can get positive with two negative axes

		return ( this.max.x < this.min.x ) || ( this.max.y < this.min.y );

	}

	getCenter( target ) {
    if (this.isEmpty()) {
      return target.set( 0, 0 );
    } else {
      const newV = this.min.clone();
      newV.add(this.max).scale(0.5).cloneTo(target);
      return target;
    }
	}

	containsPoint( point ) {

		return point.x < this.min.x || point.x > this.max.x ||
			point.y < this.min.y || point.y > this.max.y ? false : true;

	}


}

Box2.prototype.isBox2 = true;

export default Box2;
