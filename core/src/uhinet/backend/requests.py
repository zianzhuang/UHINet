from typing import Tuple
from pathlib import Path

import matplotlib
import logging

from TFPix2Pix.predictor import Predictor
from ..frontend.components import GISLayer, Polygon, Orientation, Season
from .data.image_formatting import alter_area, diff_images
from .data.components import BBox, ImageSize, LatLon
from .data.helpers import conform_coordinates_to_spatial_resolution
from .data.sentinel_hub import SentinelHubAccessor
from .file_manager import save_pyplot_image


class Requests():
    def __init__(self,
                 instance_id: str,
                 winter_weights_file: Path,
                 spring_weights_file: Path,
                 summer_weights_file: Path,
                 fall_weights_file: Path) -> None:
        self.predictors = {
            Season.WINTER: Predictor(weights=winter_weights_file,
                                     input_shape=(256, 256, 3)),
            Season.SPRING: Predictor(weights=spring_weights_file,
                                     input_shape=(256, 256, 3)),
            Season.SUMMER: Predictor(weights=summer_weights_file,
                                     input_shape=(256, 256, 3)),
            Season.FALL: Predictor(weights=fall_weights_file,
                                   input_shape=(256, 256, 3))}

        self.accessor = SentinelHubAccessor(instance_id=instance_id)

    def __str__(self) -> str:
        return 'Requests'

    def predict(self,
                polygon: Polygon,
                season: Season,
                flask_static_dir: Path) -> Tuple[GISLayer, GISLayer, GISLayer]:
        lat = 0
        lon = 0
        for coord in polygon.coordinates:
            lat += coord.lat
            lon += coord.lon
        lat /= len(polygon.coordinates)
        lon /= len(polygon.coordinates)
        new_coords = conform_coordinates_to_spatial_resolution(
            spatial_resolution=5,
            image_size=ImageSize(width=512, height=512),
            center=LatLon(lat=lat,
                          lon=lon))
        images = []
        for layer in ['RGB', 'LST']:
            images.append(self.accessor.get_landsat_image(
                layer=layer,
                date='latest',
                image_size=ImageSize(width=512, height=512),
                cloud_cov_perc=0.1,
                bbox=new_coords))
        before_rgb, before_lst = images
        matplotlib.use('agg')
        if len(before_rgb) == 0:
            logging.critical(
                'Requests: no RGB image found for those coordinates')
            raise
        before_rgb = before_rgb[0]
        after_rgb = alter_area(image=before_rgb,
                               polygon=polygon,
                               season=season)
        save_to = flask_static_dir / 'before_rgb.png'
        save_pyplot_image(str(save_to), before_rgb)
        before_lst = self.predictors[season].predict(save_to)
        save_to = flask_static_dir / 'after_rgb.png'
        save_pyplot_image(str(save_to), after_rgb)
        after_lst = self.predictors[season].predict(save_to)

        # TODO dtype from predictor create black images
        diff, val = diff_images(reference=before_lst, other=after_lst)

        save_pyplot_image(str(flask_static_dir / 'before.png'), before_lst)
        save_pyplot_image(str(flask_static_dir / 'after.png'), after_lst)
        save_pyplot_image(str(flask_static_dir / 'diff.png'), diff)
        before_lst = GISLayer(image=Path('before.png'),
                              coordinates=new_coords)
        after_lst = GISLayer(image=Path('after.png'),
                             coordinates=new_coords)
        diff = GISLayer(image=Path('diff.png'),
                        coordinates=new_coords)
        return (before_lst, after_lst, diff)
