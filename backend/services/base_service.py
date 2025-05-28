from typing import Optional, List, Dict, Any
from models.base import db

class BaseService:
    def __init__(self, model_class):
        self.model_class = model_class

    def get_by_id(self, id: int) -> Optional[Any]:
        return self.model_class.query.get(id)

    def get_all(self) -> List[Any]:
        return self.model_class.query.all()

    def create(self, data: Dict) -> Any:
        try:
            instance = self.model_class(**data)
            db.session.add(instance)
            db.session.commit()
            return instance
        except Exception as e:
            db.session.rollback()
            raise e

    def update(self, id: int, data: Dict) -> Optional[Any]:
        try:
            instance = self.get_by_id(id)
            if not instance:
                return None
            
            for key, value in data.items():
                setattr(instance, key, value)
            
            db.session.commit()
            return instance
        except Exception as e:
            db.session.rollback()
            raise e

    def delete(self, id: int) -> bool:
        try:
            instance = self.get_by_id(id)
            if not instance:
                return False
            
            db.session.delete(instance)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            raise e 