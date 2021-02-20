from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm.session import sessionmaker
Base = automap_base()

class Race(Base):
    __tablename__ = 'race'

engine = create_engine("mysql+mysqlconnector://macbook:admin@192.168.1.13:3306/mydb")
session = sessionmaker(bind=engine)()

metadata = MetaData()

Base.prepare(engine, reflect=True)


Tables = Base.classes
