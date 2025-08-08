"""Generate Swagger/OpenAPI schema for the backend."""
import json
import os
from app import create_app
from flask_swagger import swagger


def main() -> None:
    app = create_app()
    with app.app_context():
        spec = swagger(app)
        spec['info'] = {
            'title': 'Web Control Panel API',
            'version': '2.0.0'
        }
    output_path = os.path.join(os.path.dirname(__file__), 'swagger.json')
    with open(output_path, 'w') as f:
        json.dump(spec, f, indent=2)


if __name__ == '__main__':
    main()
