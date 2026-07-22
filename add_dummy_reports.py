from pymongo import MongoClient
import datetime

client = MongoClient("mongodb://localhost:27017/")
db = client["smartroad_db"]
reports = db["reports"]

dummy_reports = [
    {
        "title": "Lubang Kecil di Padasuka (Hijau)",
        "description": "Lubang kecil tapi bisa membahayakan motor jika malam hari.",
        "category": "Jalan Berlubang",
        "severity": "Rendah",
        "dimension": "Kecil (< 50cm)",
        "address": "Jl. Padasuka, Cimahi",
        "lat": -6.8735,
        "lng": 107.5350,
        "status": "Menunggu",
        "upvote_count": 2, 
        "created_at": datetime.datetime.now(),
        "user_email": "dummy@example.com",
        "user_name": "Warga Peduli",
        "image_path": ""
    },
    {
        "title": "Jalan Rusak Sedang (Kuning)",
        "description": "Aspal mengelupas cukup panjang, bahaya saat hujan turun.",
        "category": "Aspal Mengelupas",
        "severity": "Sedang",
        "dimension": "Sedang (50cm - 1m)",
        "address": "Jl. Pojok Utara, Cimahi",
        "lat": -6.8760,
        "lng": 107.5365,
        "status": "Menunggu",
        "upvote_count": 12, 
        "created_at": datetime.datetime.now(),
        "user_email": "dummy@example.com",
        "user_name": "Pahlawan Jalanan",
        "image_path": ""
    },
    {
        "title": "Lubang Sangat Dalam dan Besar (Merah)",
        "description": "Lubang besar dan dalam, sudah banyak korban jatuh di sini. Tolong segera diperbaiki!",
        "category": "Jalan Berlubang",
        "severity": "Tinggi",
        "dimension": "Besar (> 1m)",
        "address": "Jl. Pasirkaliki, Cimahi",
        "lat": -6.8775,
        "lng": 107.5335,
        "status": "Menunggu",
        "upvote_count": 35, 
        "created_at": datetime.datetime.now(),
        "user_email": "dummy@example.com",
        "user_name": "Suhu Jalanan",
        "image_path": ""
    }
]

reports.insert_many(dummy_reports)
print("Dummy reports inserted successfully!")
