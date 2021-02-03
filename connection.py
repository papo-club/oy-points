from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm.session import sessionmaker

engine = create_engine("mysql://root:admin@localhost:3306/mydb")
session = sessionmaker(bind=engine)()

metadata = MetaData()

Base = automap_base()
Base.prepare(engine, reflect=True)

Season = Base.classes.season
Member = Base.classes.member
Race   = Base.classes.race