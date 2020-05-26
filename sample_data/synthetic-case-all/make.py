import os
import csv

with open('header-info.csv') as csvfile:
    readCSV = csv.reader(csvfile, delimiter=';')
    header = next(readCSV)
    for row in readCSV:
            dirname = "/".join((row[1], row[0]))
            if not os.path.exists(dirname):
                os.makedirs(dirname)
