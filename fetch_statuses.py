import re
import time
from collections import Counter

import pandas as pd
import requests
import schedule
from bs4 import BeautifulSoup
from tqdm import tqdm


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
  else:
    return src


def parse_lot_link(link):
  id = re.match(r'https://www\.ahuzot\.co\.il/Parking/ParkingDetails/\?ID=(\d+)', link.attrs['href']).group(1)
  name = link.text.strip()
  return id, name

def get_all_statuses():
  r = requests.get('https://www.ahuzot.co.il/Parking/All/')
  soup = BeautifulSoup(r.text, 'html.parser')
  links = [link for link in soup.find('table', id='ctl10_data1').find_all('a') if 'href' in link.attrs]
  names = {id: name for (id, name) in map(parse_lot_link, links)}
  statuses = dict()
  for id in tqdm(names.keys()):
    try:
      statuses[id] = get_status(id)
    except KeyError:
      statuses[id] = 'na'


  return statuses, names

def job():
  now = time.time()
  nice_now = time.strftime('%D %H:%M', time.localtime())
  print(nice_now)
  statuses, names = get_all_statuses()
  status_counts = Counter(statuses.values())
  print(status_counts)

  if status_counts['na'] + status_counts['active'] > 80:
    print("Nothing to save :(")
    return

  pd.Series(names).to_csv('lot_names.csv', header=['name'], index_label='id')

  new_items = [dict(id=id, status=status, time=now, nice_time=nice_now) for (id, status) in statuses.items()]
  new_df = pd.DataFrame(new_items)
  try:
    df = pd.read_csv('lot_records.csv')
  except FileNotFoundError:
    df = pd.DataFrame(columns=['id', 'status', 'time', 'nice_time'])

  df = pd.concat([df, new_df], ignore_index=True)
  df.to_csv('lot_records.csv', index=False)

if __name__ == '__main__':
  schedule.every().hour.at(":00").do(job)
  schedule.every().hour.at(":30").do(job)

  while True:
    schedule.run_pending()
    time.sleep(1)
