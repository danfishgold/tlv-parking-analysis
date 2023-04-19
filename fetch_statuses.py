import json
import re
import time
from collections import Counter

import requests
import schedule
from bs4 import BeautifulSoup
from tqdm import tqdm

# these lot are relevant for Tel Aviv's GIS night lots layer
high_priority_lot_ids = {'19','20','25','26','41','46','47','53','54','55','56','57','58','59','60','62','63','64','65','67','68','69','70','72','73','74','75','76','77','78','79','80','81','84','85','86','87','88','89','90','91','96','108','110','114','124','126','132','133','134','135'}

def get_status(id: str) -> str:
  r = requests.get(f'https://www.ahuzot.co.il/Parking/ParkingDetails/?ID={id}')
  soup = BeautifulSoup(r.text, 'html.parser')
  status_table = soup.find('td', class_='ParkingDetailsTable')
  if not status_table:
    raise KeyError('No parking details table found')
  status_image = status_table.find('img')
  if not status_image:
    raise KeyError('No parking details image found')

  src = status_image.attrs['src']
  if src == '/pics/ParkingIcons/panui.png':
    return 'available'
  elif src == '/pics/ParkingIcons/meat.png':
    return 'few'
  elif src == '/pics/ParkingIcons/pail.png':
    return 'active'
  elif src == '/pics/ParkingIcons/male.png':
    return 'full'
  elif src == '/pics/ParkingIcons/sagur.png':
    return 'closed'
  else:
    return src


def parse_lot_link(link):
  id = re.match(r'https://www\.ahuzot\.co\.il/Parking/ParkingDetails/\?ID=(\d+)', link.attrs['href']).group(1)
  name = link.text.strip()
  return id, name

def get_lot_names():
  r = requests.get('https://www.ahuzot.co.il/Parking/All/')
  soup = BeautifulSoup(r.text, 'html.parser')
  links = [link for link in soup.find('table', id='ctl10_data1').find_all('a') if 'href' in link.attrs]
  names = {id: name for (id, name) in map(parse_lot_link, links)}
  return names

def get_all_statuses(high_priority_lot_ids = set()):
  r = requests.get('https://www.ahuzot.co.il/Parking/All/')
  soup = BeautifulSoup(r.text, 'html.parser')
  links = [link for link in soup.find('table', id='ctl10_data1').find_all('a') if 'href' in link.attrs]
  names = {id: name for (id, name) in map(parse_lot_link, links)}
  high_priority_ids = set(names.keys()).intersection(high_priority_lot_ids)
  low_priority_ids = set(names.keys()).difference(high_priority_lot_ids)
  ids = list(high_priority_ids) + list(low_priority_ids)
  statuses = dict()
  for id in tqdm(ids):
    try:
      statuses[id] = get_status(id)
    except KeyError:
      statuses[id] = 'na'


  return statuses, names

def job():
  now = time.time()
  formatted_now = time.strftime('%D %H:%M', time.localtime())
  print(formatted_now)
  statuses, names = get_all_statuses(high_priority_lot_ids)
  status_counts = Counter(statuses.values())
  print(status_counts)

  if not statuses:
    print("Nothing to save :(")
    return

  with open('lotNames.json', 'w') as f:
    json.dump(names, f, ensure_ascii=False)

  try:
    with open('lotRecords.json', 'r') as f:
      records = json.load(f)
  except FileNotFoundError:
    records = dict()

  records[now] = statuses

  with open('lotRecords.json', 'w') as f:
    json.dump(records, f)

if __name__ == '__main__':
  print("Scheduling every half an hour")
  schedule.every().hour.at(":00").do(job)
  schedule.every().hour.at(":30").do(job)

  while True:
    schedule.run_pending()
    time.sleep(1)
