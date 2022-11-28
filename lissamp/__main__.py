import tkinter
from tkinter import ttk


class Root(tkinter.Tk):
    def __init__(self):
        super(Root,self).__init__()
        self.title("Lissajous Sampler")
        self.minsize(500,400)


root = Root()
frm = ttk.Frame(root, padding=10)
frm.grid()
ttk.Label(frm, text="Hello World!").grid(column=0, row=0)
ttk.Button(frm, text="Quit", command=root.destroy).grid(column=1, row=0)
root.mainloop()