import sys
from os import system

from dateutil.parser import parse as dateparse
from pick import pick

Null = object()


class Prompt:
    def __init__(self, name, validate=None, default=Null) -> None:
        self.imperative = "Enter"
        self.name = name
        self.validate = validate
        self.default = default

        self.__repr__ = lambda self: f"{self.__class__.__name__} prompt type"

    def __repr__(self) -> str:
        return "Prompt superclass"

    @property
    def title(self):
        return f"{self.imperative} {self.name}: "

    def parse(self, response):
        return response

    @staticmethod
    def clear():
        system("cls")
        system("clear")

    def prompt(self):
        while True:
            if self.default:
                response = input(
                    f"{self.imperative} {self.name} (default: {self.default}): "
                )
            else:
                response = input(self.title)
            try:
                if not response:
                    if self.default is not Null:
                        response = self.default
                    else:
                        raise ValueError

                response = self.parse(response)

                if self.validate:
                    if self.validate(response):
                        break
                    else:
                        raise ValueError
                else:
                    break

            except Exception:
                Prompt.clear()
                print(f"Invalid {self.name} '{response}'")

        Prompt.clear()
        return response


class List(Prompt):
    def __init__(self, name, options, indicator="->", default=None) -> None:
        self.imperative = "Select"
        self.options = options
        self.indicator = indicator
        self.default = default

        super().__init__(name, default=default)

    def prompt(self):
        index = 0
        if self.default:
            index = self.options.index(self.default)
        if not self.options:
            print("No entries could be found. Aborting...")
            sys.exit()
        return pick(self.options, self.title, self.indicator, default_index=index)[0]


class Int(Prompt):
    def __init__(self, name, validate=None, default=None) -> None:
        super().__init__(name, validate=validate, default=default)

    def parse(self, response):
        return int(response)


class Text(Prompt):
    def __init__(self, name, validate=None, default=None) -> None:
        super().__init__(name, validate=validate, default=default)


class Date(Prompt):
    def __init__(self, name, validate=None, default=None) -> None:
        super().__init__(name, validate=validate, default=default)

    def parse(self, response):
        date = dateparse(response)
        return date.strftime("%Y-%m-%d")


class Form:
    def __init__(self, prompts):
        self.prompts = prompts

    def execute(self):
        if type(self.prompts) is dict:
            new = {}
            for key, prompt in self.prompts.items():
                new[key] = prompt.prompt()
            return new
        elif type(self.prompts) in [list, tuple]:
            new = []
            for prompt in self.prompts:
                new.append(prompt.prompt())
            return new
        else:
            return NotImplementedError
