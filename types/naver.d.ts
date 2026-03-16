declare namespace naver.maps {
  class Point {
    constructor(x: number, y: number);
    x: number;
    y: number;
  }

  class Size {
    width: number;
    height: number;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }

  type MarkerIcon = {
    content: string;
    anchor: Point;
  };

  class LatLngBounds {
    constructor();
    extend(latLng: LatLng): void;
    hasLatLng(latLng: LatLng): boolean;
  }

  type MarkerOptions = {
    position: LatLng;
    map: Map;
  };

  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    setPosition(position: LatLng): void;
    getPosition(): LatLng;
    setIcon(icon: MarkerIcon | null): void;
    setZIndex(zIndex: number): void;
  }

  interface MapProjection {
    fromCoordToOffset(coord: LatLng): Point;
    fromOffsetToCoord(offset: Point): LatLng;
  }

  type MapOptions = {
    center: LatLng;
    zoom: number;
    zoomControl: boolean;
  };

  class Map {
    constructor(element: HTMLElement, options: MapOptions);
    setZoom(level: number, effect?: boolean): void;
    getZoom(): number;
    getBounds(): {
      hasLatLng(latLng: LatLng): boolean;
    };
    getProjection(): MapProjection;
    getSize(): Size;
    panTo(target: LatLng): void;
    fitBounds(
      bounds: LatLngBounds,
      padding?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
      },
    ): void;
  }

  type EventHandle = object;

  namespace Event {
    function addListener(
      target: unknown,
      eventName: string,
      listener: (event?: unknown) => void,
    ): EventHandle;
    function removeListener(handle: EventHandle): void;
    function trigger(target: unknown, eventName: string): void;
  }
}

type NaverGlobal = {
  maps: typeof naver.maps;
};

interface Window {
  naver?: NaverGlobal;
}
